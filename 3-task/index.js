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

  function getContactsPage(nextLink) {
    let query = nextLink
      ? nextLink
      : `?$select=birthdate,emailaddress1,firstname,lastname&$filter=birthdate ne null and nw_last_birthday_congrat eq null`

    return new Promise((resolve, reject) => {
      window.opener.Xrm.WebApi.retrieveMultipleRecords("contact", query).then(
        function success(result) {
          contacts = contacts.concat(result.entities)

          if (result["@odata.nextLink"]) {
            getContactsPage(result["@odata.nextLink"]).then(resolve).catch(reject)
          } else {
            resolve(contacts)
          }
        },
        function error(err) {
          console.error("Ошибка при получении контактов:", err)
          reject(err)
        }
      )
    })
  }

  return getContactsPage(null)
}

async function sendCongratulations(contacts) {
  const progressBar = defineProgressBar(contacts.length)
  progressBar.render()

  if (!contacts.length) {
    $startBtn.disabled = false
    return
  }

  for (const [idx, contact] of contacts.entries()) {
    const { emailaddress1, firstname, lastname, birthdate, contactid } = contact
    const fullName = `${firstname} ${lastname}`
    const isLast = idx === contacts.length - 1

    try {
      await wait(200)

      const emailResponse = await sendEmail(emailaddress1, fullName)
      if (emailResponse !== "OK") {
        console.log("Email error")
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

function sendEmail(email, name) {
  return Email.send({
    SecureToken: "3dac010a-4bea-4187-9b8a-d630ac47693c",
    From: "vasilechek9786@gmail.com",
    To: email,
    Subject: "Happy birthday!",
    Body: `Hi ${name}, Happy Birthday and all the best!`,
  })
}

function updateLastBirthdayCongratField(id, date) {
  return new Promise((res, rej) => {
    window.opener.Xrm.WebApi.updateRecord("contact", id, {
      nw_last_birthday_congrat: date,
    }).then(
      function success() {
        res("Account updated!")
      },
      function error(err) {
        rej(err)
      }
    )
  })
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
