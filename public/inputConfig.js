const $passwordInputs = Array.from(document.querySelectorAll('input[type="password"]'));

for (const $passwordInput of $passwordInputs) {
    $passwordInput.addEventListener("mouseenter", () => {
        $passwordInput.type = "text";
    });

    $passwordInput.addEventListener("mouseleave", () => {
        $passwordInput.type = "password";
    });
}

const $numericInputs = Array.from(document.querySelectorAll("input.numericInput"));

for (const $input of $numericInputs) {
    $input.addEventListener("input", () => {
        let value = $input.value;

        value = value.replace(/[^0-9.]/g, '');

        const parts = value.split('.');
        if (parts.length > 2) {
            value = parts[0] + '.' + parts.slice(1).join('').replace(/\./g, '');
        }

        if (value === '' || value === '.') {
            value = '0';
        }

        if (value.startsWith('.')) {
            value = '0' + value;
        }

        $input.value = value;
    });
}
