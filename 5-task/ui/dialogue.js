const $authPage = document.querySelector(".auth-page")
const $dialoguePage = document.querySelector(".dialogue-page")

export function showDialogue() {
  $authPage.classList.add("hide")
  $dialoguePage.classList.add("show")
}
