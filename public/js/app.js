const REQUEST_DRAFT_KEY = 'requestDraft';

const sampleRequests = [
    {
        id: 1,
        date: '06.05.2026',
        vehicle: 'КамАЗ',
        problem: 'Нужно проверить форсунку',
        status: 'Новая'
    },
    {
        id: 2,
        date: '06.05.2026',
        vehicle: 'Служебный автомобиль',
        problem: 'Не заводится после простоя',
        status: 'Не хватает данных'
    },
    {
        id: 3,
        date: '06.05.2026',
        vehicle: 'Автобус',
        problem: 'Плановое обслуживание',
        status: 'Принято'
    }
];

document.addEventListener('DOMContentLoaded', function () {
    initRequestForm();
    renderRequestsTable();
});

function initRequestForm() {
    const form = document.getElementById('requestForm');

    if (!form) {
        return;
    }

    const message = document.getElementById('formMessage');

    loadRequestDraft(form);

    form.addEventListener('input', function () {
        saveRequestDraft(form);
    });

    form.addEventListener('reset', function () {
        clearRequestDraft();
        clearErrors(form);
        showMessage(message, '', false);
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

        // Later this data will go to PHP API.
        showMessage(message, 'Заявка заполнена корректно. Отправка появится позже.', false);
    });
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

function renderRequestsTable() {
    const tableBody = document.getElementById('requestsTableBody');

    if (!tableBody) {
        return;
    }

    tableBody.innerHTML = '';

    sampleRequests.forEach(function (request) {
        const row = document.createElement('tr');

        // Пока данные тестовые, потом будут приходить из API.
        row.innerHTML = `
            <td>${request.id}</td>
            <td>${request.date}</td>
            <td>${request.vehicle}</td>
            <td>${request.problem}</td>
            <td>${request.status}</td>
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
