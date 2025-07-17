const $errorMessage = document.querySelector("#errorMessage");
const $errorContainer = document.querySelector(".errorContainer");
const $closeError = document.querySelector("#closeError");

/**
 * 
 * @param {string} error 
 */
export function showError(error) {
    $errorContainer.classList.remove("hidden");
    $errorMessage.textContent = error;
}

$closeError.addEventListener("click", () => {
    $errorContainer.classList.add("hidden");
});
