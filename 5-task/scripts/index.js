import { CONTACTS } from "../const/endpoints.js"
import { initUser } from "./login.js"
import { $fetch } from "../utils/fetch.js"
import { sendCongratulationEmail } from "../utils/sendCongratulationEmail.js"

const $startDate = document.querySelector(".datepicker__field--start")
const $endDate = document.querySelector(".datepicker__field--end")
const $datepickerLabelStart = document.querySelector(".datepicker__label--start")
const $datepickerLabelEnd = document.querySelector(".datepicker__label--end")
const $datepickerValueStart = document.querySelector(".datepicker__value--start")
const $datepickerValueEnd = document.querySelector(".datepicker__value--end")
const $startBtn = document.querySelector(".btn-start")
const $cancelBtn = document.querySelector(".btn-cancel")
const $progressIndicator = document.querySelector(".progress-bar__indicator")
const $progressStatus = document.querySelector(".progress-bar__status")

initUser()

$startBtn.addEventListener("click", startProcessing)
$cancelBtn.addEventListener("click", cancelProcessing)

let shouldStopProcess = false

const datepickerOptions = {
  id: 1,
  onSelect: onDatepickerSelect,
  minDate: new Date(),
}

const startPicker = datepicker($startDate, datepickerOptions)
const endPicker = datepicker($endDate, datepickerOptions)

function onDatepickerSelect(instance) {
  const dateTarget = instance.el.dataset.valueTarget
  const { start, end } = instance.getRange()

  if (dateTarget === "start") {
    if (validateStartDate(start, instance))
      setDate($datepickerLabelStart, $datepickerValueStart, start)

    return
  }

  if (validateEndDate(end, instance)) setDate($datepickerLabelEnd, $datepickerValueEnd, end, true)
}

function validateStartDate(startDate, instance) {
  const today = new Date().setHours(0, 0, 0, 0)

  if (startDate < today || startDate > today) {
    instance.setDate()
    clearDate($datepickerLabelStart, $datepickerValueStart)
    alert("Start date should be today.")
    return false
  }

  return true
}

function validateEndDate(endDate, instance) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const maxEndDate = new Date()
  maxEndDate.setHours(0, 0, 0, 0)
  maxEndDate.setDate(today.getDate() + 7)

  if (endDate > maxEndDate) {
    instance.setDate()
    clearDate($datepickerLabelEnd, $datepickerValueEnd)
    alert("End date should not be more than 7 days from today.")
    return false
  }

  return true
}

async function startProcessing() {
  $startBtn.disabled = true
  $cancelBtn.disabled = false
  shouldStopProcess = false

  const startDate = getNormalizedDateValue($datepickerValueStart)
  const endDate = getNormalizedDateValue($datepickerValueEnd)

  if (!startDate || !endDate) return

  const contacts = await retrieveAllContacts()
  const filtredContacts = filterContacts(contacts)
  await sendCongratulations(filtredContacts)

  $startBtn.disabled = false
  $cancelBtn.disabled = true
}

async function retrieveAllContacts() {
  let contacts = []
  let nextLink = null
  const qp = new URLSearchParams({
    $select: "birthdate,emailaddress1,firstname,lastname,gendercode",
    $filter: "birthdate ne null and nw_last_birthday_congrat eq null",
  })
  const url = !nextLink ? `${CONTACTS}?${qp.toString()}` : nextLink

  do {
    const response = await $fetch(url)

    if (!response.ok) return console.error("Error retrieving contacts:", response.statusText)

    const data = await response.json()
    contacts = contacts.concat(data.value)
    nextLink = data["@odata.nextLink"]
  } while (nextLink)

  return contacts
}

async function sendCongratulations(contacts) {
  const progressBar = defineProgressBar(contacts.length)
  progressBar.render()

  if (!contacts.length) {
    $startBtn.disabled = false
    return
  }

  for (const [idx, contact] of contacts.entries()) {
    const {
      emailaddress1: email,
      firstname,
      lastname,
      contactid,
      gendercode: genderValue,
    } = contact
    const isLast = idx === contacts.length - 1

    try {
      await wait(200)

      const emailResponse = await sendCongratulationEmail({
        firstname,
        lastname,
        email,
        genderValue,
      })
      if (emailResponse !== "OK") {
        throw new Error("Message hasn't been sent!")
      }

      await updateLastBirthdayCongratField(contactid, new Date())
      progressBar.incrementSuccessfull()
    } catch (err) {
      console.log(err)
      progressBar.incrementFailed()
    } finally {
      progressBar.render({ isLast })
    }

    if (shouldStopProcess) {
      progressBar.setRestContactsFailed()
      progressBar.render({ isLast: true })
      return
    }
  }
}

async function updateLastBirthdayCongratField(id, date) {
  const body = JSON.stringify({
    nw_last_birthday_congrat: date,
  })

  const response = await $fetch(`${CONTACTS}(${id})`, {
    method: "PATCH",
    body,
  })

  if (!response.ok) {
    throw new Error("Failed to update contact")
  }
}

function cancelProcessing() {
  const confirmation = confirm("Are you sure that you want to cancel the processing?")

  if (confirmation) {
    shouldStopProcess = true
    $startBtn.disabled = false
    $cancelBtn.disable = true
  }
}

function defineProgressBar(total) {
  let totalContacts = total,
    processedContacts = 0,
    successfullContacts = 0,
    failedContacts = 0

  const updateProgress = () => {
    const progress = (processedContacts / totalContacts) * 100
    $progressIndicator.style.setProperty("--progress", progress)
  }

  const writeStatus = (isLast) => {
    if (!totalContacts) {
      $progressStatus.textContent =
        "No contacts were found who have a birthday in the specified range"
      return
    }

    const regularStatus = `Processed contacts ${processedContacts} from ${totalContacts}`
    const lastStatus = `${processedContacts} contacts are processed, ${successfullContacts} congratulation e-mails were suceesfully sent (sending of ${failedContacts} e-mails failed)".`
    const status = isLast ? lastStatus : regularStatus

    $progressStatus.textContent = status
  }

  return {
    incrementSuccessfull() {
      successfullContacts += 1
      processedContacts += 1
    },
    incrementFailed() {
      failedContacts += 1
      processedContacts += 1
    },
    setRestContactsFailed() {
      failedContacts = failedContacts + (totalContacts - processedContacts)
    },
    render(options) {
      console.log("Render progress...")
      updateProgress()
      writeStatus(options?.isLast)
    },
  }
}

function filterContacts(contacts) {
  if (!contacts?.length) return []
  const normalizedStartDate = getNormalizedDateValue($datepickerValueStart)
  const normalizedEndDate = getNormalizedDateValue($datepickerValueEnd)
  const startDay = new Date(normalizedStartDate).getDate()
  const endDay = new Date(normalizedEndDate).getDate()
  const startMonth = new Date(normalizedStartDate).getMonth()
  const endMonth = new Date(normalizedEndDate).getMonth()

  return contacts.filter((contact) => {
    const birthDate = new Date(contact.birthdate)
    const month = birthDate.getMonth()
    const day = birthDate.getDate()

    return month >= startMonth && month <= endMonth && day >= startDay && day <= endDay
  })
}

function getNormalizedDateValue(el) {
  return new Date(el.dataset.value.split(".").reverse().join("-")).toISOString()
}

function setDate($label, $value, date, enableStartBtn) {
  const value = date.toLocaleDateString()

  $label.dataset.priority = false
  $value.textContent = value
  $value.dataset.value = value

  if (enableStartBtn) $startBtn.disabled = false
}

function clearDate($label, $value) {
  $label.dataset.priority = true
  $value.textContent = ""
  $value.dataset.value = undefined

  $startBtn.disabled = true
}

function wait(delay) {
  return new Promise((resolve) => setTimeout(() => resolve(), delay))
}
