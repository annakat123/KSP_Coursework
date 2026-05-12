const REQUEST_DRAFT_KEY = 'requestDraft';
const REQUESTS_API_URL = '../api/requests.php';
const PARTS_API_URL = '../api/parts.php';
const PART_REQUESTS_API_URL = '../api/part_requests.php';

let requests = [];

document.addEventListener('DOMContentLoaded', function () {
    initRequestForm();
    initRequestsPage();
    initPartRequestsPage();
});

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
        headers: {
            'Content-Type': 'application/json'
        },
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
        const action = request.status === 'Принято'
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

function renderPartRequests(items) {
    const tableBody = document.getElementById('partRequestsTableBody');

    tableBody.innerHTML = '';

    if (items.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4">Заявок на новые детали пока нет</td></tr>';
        return;
    }

    items.forEach(function (item) {
        const row = document.createElement('tr');

        row.innerHTML = `
            <td>${item.id}</td>
            <td>${item.date}</td>
            <td>${item.name}</td>
            <td>${item.status}</td>
        `;

        tableBody.appendChild(row);
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
