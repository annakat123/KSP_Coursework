const REQUEST_DRAFT_KEY = 'requestDraft';
const AUTH_USER_KEY = 'currentUser';
const REQUESTS_API_URL = '../api/requests.php';
const PARTS_API_URL = '../api/parts.php';
const PART_REQUESTS_API_URL = '../api/part_requests.php';
const LOGS_API_URL = '../api/logs.php';

let requests = [];

document.addEventListener('DOMContentLoaded', function () {
    initAuth();
    initLoginForm();
    initRequestForm();
    initRequestsPage();
    initPartRequestsPage();
    initLogsPage();
});

function initAuth() {
    const user = getCurrentUser();
    const nav = document.querySelector('nav');

    if (!nav) {
        return;
    }

    if (!isAdmin()) {
        hideAdminLinks();
    }

    const label = document.createElement('span');
    label.className = 'user-label';

    if (user) {
        label.textContent = `Пользователь: ${user.email} (${getRoleName(user.role)})`;
        nav.appendChild(label);
        nav.appendChild(createLogoutButton());
    } else {
        label.textContent = 'Вход не выполнен';
        nav.appendChild(label);
    }
}

function initLoginForm() {
    const form = document.getElementById('loginForm');

    if (!form) {
        return;
    }

    const message = document.getElementById('loginMessage');
    const logoutButton = document.getElementById('logoutButton');
    const user = getCurrentUser();

    if (user) {
        form.email.value = user.email;
        form.role.value = user.role;
        showMessage(message, `Сейчас выбран ${getRoleName(user.role)}.`, false);
    }

    form.addEventListener('submit', function (event) {
        event.preventDefault();

        const email = form.email.value.trim();
        const password = form.password.value.trim();
        const role = form.role.value;

        if (email === '' || password.length < 3) {
            showMessage(message, 'Введите email и пароль минимум из 3 символов.', true);
            return;
        }

        localStorage.setItem(AUTH_USER_KEY, JSON.stringify({
            email: email,
            role: role
        }));

        showMessage(message, `Вход выполнен как ${getRoleName(role)}.`, false);
        setTimeout(function () {
            window.location.href = 'index.html';
        }, 400);
    });

    logoutButton.addEventListener('click', function () {
        logout();
        showMessage(message, 'Вы вышли из системы.', false);
        form.password.value = '';
    });
}

function createLogoutButton() {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'logout-link';
    button.textContent = 'Выйти';

    button.addEventListener('click', function () {
        logout();
        window.location.href = 'login.html';
    });

    return button;
}

function logout() {
    localStorage.removeItem(AUTH_USER_KEY);
}

function getCurrentUser() {
    const saved = localStorage.getItem(AUTH_USER_KEY);

    if (!saved) {
        return null;
    }

    try {
        return JSON.parse(saved);
    } catch (error) {
        localStorage.removeItem(AUTH_USER_KEY);
        return null;
    }
}

function isAdmin() {
    const user = getCurrentUser();

    return user && user.role === 'admin';
}

function getAuthHeaders() {
    const user = getCurrentUser();

    return {
        'Content-Type': 'application/json',
        'X-User-Role': user ? user.role : ''
    };
}

function getRoleName(role) {
    return role === 'admin' ? 'администратор' : 'клиент';
}

function hideAdminLinks() {
    const links = document.querySelectorAll('a[href="part-requests.html"], a[href="logs.html"]');

    links.forEach(function (link) {
        link.classList.add('hidden');
    });
}

function showAccessDenied(tableBodyId, colspan) {
    const tableBody = document.getElementById(tableBodyId);

    if (tableBody) {
        tableBody.innerHTML = `<tr><td colspan="${colspan}">Доступ только для администратора</td></tr>`;
    }
}

function initRequestForm() {
    const form = document.getElementById('requestForm');

    if (!form) {
        return;
    }

    const message = document.getElementById('formMessage');
    const result = document.getElementById('requestResult');

    loadRequestDraft(form);
    initPartCheck(form);

    form.addEventListener('input', function () {
        saveRequestDraft(form);
    });

    form.addEventListener('reset', function () {
        clearRequestDraft();
        clearErrors(form);
        showMessage(message, '', false);
        showRequestResult(result, null);
    });

    form.addEventListener('submit', function (event) {
        event.preventDefault();

        clearErrors(form);

        const clientName = form.clientName.value.trim();
        const vehicle = form.vehicle.value.trim();
        const description = form.description.value.trim();
        const errors = [];

        // Простая проверка перед будущей отправкой на сервер
        if (clientName.length < 3) {
            errors.push('Укажите ФИО заявителя.');
            markError(form.clientName);
        }

        if (vehicle.length < 2) {
            errors.push('Укажите машину или технику.');
            markError(form.vehicle);
        }

        if (description.length < 10) {
            errors.push('Описание проблемы должно быть подробнее.');
            markError(form.description);
        }

        if (errors.length > 0) {
            showMessage(message, errors.join(' '), true);
            return;
        }

        sendRequestToApi(form, message, result);
    });
}

function initPartCheck(form) {
    const checkButton = document.getElementById('checkPartButton');
    const sendButton = document.getElementById('sendPartButton');
    const message = document.getElementById('partMessage');

    if (!checkButton || !sendButton || !message) {
        return;
    }

    checkButton.addEventListener('click', function () {
        const partName = form.partName.value.trim();
        sendButton.classList.add('hidden');

        if (partName === '') {
            showPartMessage(message, 'Сначала введите название детали.', true);
            return;
        }

        showPartMessage(message, 'Проверяем...', false);

        fetch(`${PARTS_API_URL}?q=${encodeURIComponent(partName)}`)
            .then(function (response) {
                return response.json();
            })
            .then(function (data) {
                if (data.found) {
                    showPartMessage(message, `Найдена деталь: ${data.part.name}.`, false);
                    return;
                }

                showPartMessage(message, 'Такой детали нет. Можно отправить на добавление.', true);
                sendButton.classList.remove('hidden');
            })
            .catch(function () {
                showPartMessage(message, 'Не получилось проверить деталь.', true);
            });
    });

    sendButton.addEventListener('click', function () {
        const partName = form.partName.value.trim();

        if (partName === '') {
            showPartMessage(message, 'Название детали пустое.', true);
            return;
        }

        sendPartRequest(partName, message, sendButton);
    });
}

function sendPartRequest(partName, message, button) {
    showPartMessage(message, 'Отправляем деталь...', false);

    fetch(PARTS_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: partName
        })
    })
        .then(function (response) {
            return response.json().then(function (data) {
                if (!response.ok) {
                    throw new Error(getApiErrorText(data));
                }

                return data;
            });
        })
        .then(function () {
            showPartMessage(message, 'Деталь отправлена на добавление.', false);
            button.classList.add('hidden');
        })
        .catch(function (error) {
            showPartMessage(message, error.message || 'Не удалось отправить деталь.', true);
        });
}

function showPartMessage(element, text, isError) {
    element.textContent = text;
    element.classList.toggle('error', isError);
}

function sendRequestToApi(form, message, result) {
    showMessage(message, 'Отправка заявки...', false);
    showRequestResult(result, null);

    fetch(REQUESTS_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(getRequestFormData(form))
    })
        .then(function (response) {
            return response.json().then(function (data) {
                if (!response.ok) {
                    throw new Error(getApiErrorText(data));
                }

                return data;
            });
        })
        .then(function (newRequest) {
            clearRequestDraft();
            form.reset();
            showMessage(message, 'Заявка отправлена и сохранена.', false);
            showRequestResult(result, newRequest);
        })
        .catch(function (error) {
            showMessage(message, error.message || 'Не удалось отправить заявку.', true);
        });
}

function getRequestFormData(form) {
    return {
        clientName: form.clientName.value.trim(),
        phone: form.phone.value.trim(),
        vehicle: form.vehicle.value.trim(),
        plateNumber: form.plateNumber.value.trim(),
        partName: form.partName.value.trim(),
        problemType: form.problemType.value,
        description: form.description.value.trim()
    };
}

function getApiErrorText(data) {
    if (data.errors) {
        return data.errors.join(' ');
    }

    return data.error || 'Ошибка API';
}

function showRequestResult(element, request) {
    if (!element) {
        return;
    }

    if (!request) {
        element.innerHTML = '';
        return;
    }

    element.innerHTML = `
        Заявка №${request.id} добавлена.
        <a href="requests.html">Открыть список заявок</a>
    `;
}

function saveRequestDraft(form) {
    const draft = {
        clientName: form.clientName.value,
        phone: form.phone.value,
        vehicle: form.vehicle.value,
        plateNumber: form.plateNumber.value,
        partName: form.partName.value,
        problemType: form.problemType.value,
        description: form.description.value
    };

    localStorage.setItem(REQUEST_DRAFT_KEY, JSON.stringify(draft));
}

function loadRequestDraft(form) {
    const savedDraft = localStorage.getItem(REQUEST_DRAFT_KEY);

    if (!savedDraft) {
        return;
    }

    try {
        const draft = JSON.parse(savedDraft);

        form.clientName.value = draft.clientName || '';
        form.phone.value = draft.phone || '';
        form.vehicle.value = draft.vehicle || '';
        form.plateNumber.value = draft.plateNumber || '';
        form.partName.value = draft.partName || '';
        form.problemType.value = draft.problemType || 'diagnostics';
        form.description.value = draft.description || '';
    } catch (error) {
        // If draft is broken, just start clean.
        clearRequestDraft();
    }
}

function clearRequestDraft() {
    localStorage.removeItem(REQUEST_DRAFT_KEY);
}

function initRequestsPage() {
    const tableBody = document.getElementById('requestsTableBody');

    if (!tableBody) {
        return;
    }

    initRequestFilters();
    initRequestActions();
    loadRequests();
}

function initRequestFilters() {
    const statusFilter = document.getElementById('statusFilter');
    const searchInput = document.getElementById('requestSearch');
    const resetButton = document.getElementById('resetFilters');

    if (statusFilter) {
        statusFilter.addEventListener('change', function () {
            refreshRequestsTable();
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', function () {
            refreshRequestsTable();
        });
    }

    if (resetButton) {
        resetButton.addEventListener('click', function () {
            statusFilter.value = 'all';
            searchInput.value = '';
            refreshRequestsTable();
        });
    }
}

function initRequestActions() {
    const tableBody = document.getElementById('requestsTableBody');

    if (!tableBody) {
        return;
    }

    tableBody.addEventListener('click', function (event) {
        if (!event.target.classList.contains('accept-request')) {
            return;
        }

        if (!isAdmin()) {
            alert('Менять статус может только администратор.');
            return;
        }

        const requestId = Number(event.target.dataset.id);
        const request = requests.find(function (item) {
            return item.id === requestId;
        });

        if (request) {
            updateRequestStatus(request.id, 'Принято');
        }
    });
}

function updateRequestStatus(requestId, status) {
    fetch(REQUESTS_API_URL, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
            id: requestId,
            status: status
        })
    })
        .then(function (response) {
            return response.json().then(function (data) {
                if (!response.ok) {
                    throw new Error(getApiErrorText(data));
                }

                return data;
            });
        })
        .then(function (updatedRequest) {
            const request = requests.find(function (item) {
                return item.id === updatedRequest.id;
            });

            if (request) {
                request.status = updatedRequest.status;
                refreshRequestsTable();
            }
        })
        .catch(function () {
            alert('Не удалось обновить статус заявки.');
        });
}

function loadRequests() {
    renderTableMessage('Загрузка заявок...');

    fetch(REQUESTS_API_URL)
        .then(function (response) {
            if (!response.ok) {
                throw new Error('Не удалось загрузить заявки');
            }

            return response.json();
        })
        .then(function (data) {
            requests = data;
            refreshRequestsTable();
        })
        .catch(function () {
            renderTableMessage('Ошибка загрузки заявок. Проверьте PHP сервер.');
        });
}

function refreshRequestsTable() {
    renderRequestsTable(getFilteredRequests());
}

function getFilteredRequests() {
    const statusFilter = document.getElementById('statusFilter');
    const searchInput = document.getElementById('requestSearch');
    const selectedStatus = statusFilter ? statusFilter.value : 'all';
    const searchText = searchInput ? searchInput.value.trim().toLowerCase() : '';
    let filteredRequests = requests;

    if (selectedStatus !== 'all') {
        filteredRequests = filteredRequests.filter(function (request) {
            return request.status === selectedStatus;
        });
    }

    if (searchText !== '') {
        filteredRequests = filteredRequests.filter(function (request) {
            // Не красиво, зато понятно: ищем сразу по нескольким полям.
            const text = [
                request.clientName || '',
                request.vehicle || '',
                request.problem || '',
                request.partName || ''
            ].join(' ').toLowerCase();

            return text.includes(searchText);
        });
    }

    return filteredRequests;
}

function renderRequestsTable(requests) {
    const tableBody = document.getElementById('requestsTableBody');

    if (!tableBody) {
        return;
    }

    updateRequestsCount(requests.length);
    tableBody.innerHTML = '';

    if (requests.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7">Заявки не найдены</td></tr>';
        return;
    }

    requests.forEach(function (request) {
        const row = document.createElement('tr');
        const action = !isAdmin()
            ? '-'
            : request.status === 'Принято'
            ? '-'
            : `<button type="button" class="accept-request" data-id="${request.id}">Принять</button>`;

        // Пока данные тестовые, потом будут приходить из API.
        row.innerHTML = `
            <td>${request.id}</td>
            <td>${request.date}</td>
            <td>${request.clientName || '-'}</td>
            <td>${request.vehicle}</td>
            <td>${request.problem}</td>
            <td>${request.status}</td>
            <td>${action}</td>
        `;

        tableBody.appendChild(row);
    });
}

function renderTableMessage(text) {
    const tableBody = document.getElementById('requestsTableBody');

    if (tableBody) {
        tableBody.innerHTML = `<tr><td colspan="7">${text}</td></tr>`;
    }
}

function updateRequestsCount(visibleCount) {
    const counter = document.getElementById('requestsCount');

    if (!counter) {
        return;
    }

    counter.textContent = `Показано заявок: ${visibleCount}. Всего в системе: ${requests.length}.`;
}

function initPartRequestsPage() {
    const tableBody = document.getElementById('partRequestsTableBody');

    if (!tableBody) {
        return;
    }

    if (!isAdmin()) {
        showAccessDenied('partRequestsTableBody', 5);
        return;
    }

    tableBody.addEventListener('click', function (event) {
        if (!event.target.classList.contains('add-part-request')) {
            return;
        }

        addPartFromRequest(Number(event.target.dataset.id));
    });

    loadPartRequests();
}

function loadPartRequests() {
    const tableBody = document.getElementById('partRequestsTableBody');

    fetch(PART_REQUESTS_API_URL)
        .then(function (response) {
            return response.json();
        })
        .then(function (items) {
            renderPartRequests(items);
        })
        .catch(function () {
            tableBody.innerHTML = '<tr><td colspan="4">Не удалось загрузить список</td></tr>';
        });
}

function addPartFromRequest(requestId) {
    fetch(PART_REQUESTS_API_URL, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
            id: requestId
        })
    })
        .then(function (response) {
            return response.json().then(function (data) {
                if (!response.ok) {
                    throw new Error(getApiErrorText(data));
                }

                return data;
            });
        })
        .then(function () {
            loadPartRequests();
        })
        .catch(function () {
            alert('Не удалось добавить деталь в справочник.');
        });
}

function renderPartRequests(items) {
    const tableBody = document.getElementById('partRequestsTableBody');

    tableBody.innerHTML = '';

    if (items.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5">Заявок на новые детали пока нет</td></tr>';
        return;
    }

    items.forEach(function (item) {
        const row = document.createElement('tr');
        const action = item.status === 'Добавлена'
            ? '-'
            : `<button type="button" class="add-part-request" data-id="${item.id}">Добавить</button>`;

        row.innerHTML = `
            <td>${item.id}</td>
            <td>${item.date}</td>
            <td>${item.name}</td>
            <td>${item.status}</td>
            <td>${action}</td>
        `;

        tableBody.appendChild(row);
    });
}

function initLogsPage() {
    const logsBox = document.getElementById('logsBox');

    if (!logsBox) {
        return;
    }

    if (!isAdmin()) {
        logsBox.textContent = 'Доступ к логам есть только у администратора.';
        return;
    }

    fetch(LOGS_API_URL)
        .then(function (response) {
            return response.json();
        })
        .then(function (lines) {
            if (lines.length === 0) {
                logsBox.textContent = 'Логов пока нет.';
                return;
            }

            logsBox.textContent = lines.join('\n');
        })
        .catch(function () {
            logsBox.textContent = 'Не удалось загрузить логи.';
        });
}

function markError(field) {
    field.classList.add('field-error');
}

function clearErrors(form) {
    const fields = form.querySelectorAll('.field-error');

    fields.forEach(function (field) {
        field.classList.remove('field-error');
    });
}

function showMessage(element, text, isError) {
    element.textContent = text;
    element.classList.toggle('error', isError);
}
