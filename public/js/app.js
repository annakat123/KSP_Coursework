document.addEventListener('DOMContentLoaded', function () {
    initRequestForm();
});

function initRequestForm() {
    const form = document.getElementById('requestForm');

    if (!form) {
        return;
    }

    const message = document.getElementById('formMessage');

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
