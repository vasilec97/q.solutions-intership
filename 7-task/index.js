const $templateSelect = document.querySelector(".template-select")
const $templateSelectPlaceholder = document.querySelector(".template-select__placeholder")
const $templateText = document.querySelector(".template-text")
const $datepicker = document.querySelector(".datepicker")
const $datepickerTitle = document.querySelector(".datepicker__title")
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

const Xrm = window?.Xrm || window?.parent?.Xrm || window?.opener?.Xrm

initI18n()
loadTemplateTypes()

$templateSelect.addEventListener("change", handleTemplateChange)
$startBtn.addEventListener("click", startProcessing)
$cancelBtn.addEventListener("click", cancelProcessing)
i18next.on("initialized", renderText)

let shouldStopProcess = false
let isDatepickerInited = false
const templateOptionsMap = {}

// TEMPLATE

async function loadTemplateTypes() {
  const entityLogicalName = "nw_emailtemplate"
  const attributeLogicalName = "nw_type"

  const url = `${Xrm.Utility.getGlobalContext().getClientUrl()}/api/data/v9.1/EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes(LogicalName='${attributeLogicalName}')/Microsoft.Dynamics.CRM.PicklistAttributeMetadata?$select=LogicalName&$expand=OptionSet`
  const headers = {
    "OData-MaxVersion": "4.0",
    "OData-Version": "4.0",
    Accept: "application/json",
    "Content-Type": "application/json; charset=utf-8",
  }

  const response = await fetch(url, { headers })

  if (!response.ok) return console.error(response.statusText)

  const data = await response.json()
  const options = data.OptionSet.Options

  options.forEach(function (option) {
    const { Value, Label } = option
    templateOptionsMap[option.Value] = option.Label.LocalizedLabels[0].Label

    const $option = document.createElement("option")
    $option.value = Value
    $option.textContent = capitalize(Label.LocalizedLabels[0].Label)
    $templateSelect.appendChild($option)
  })

  $templateSelect.value = ""
}

function handleTemplateChange(e) {
  const value = e.target.value

  switch (value) {
    case String(125050000):
      showDatepicker()
      if (!isDatepickerInited) initDatepicker()
      break
    case "":
      hideDatepicker()
      $startBtn.disabled = true
      break
    default:
      clearProgressBar()
      hideDatepicker()
      $startBtn.disabled = false
  }
}

// DATEPICKER

function initDatepicker() {
  const datepickerOptions = {
    id: 1,
    onSelect: onDatepickerSelect,
    minDate: new Date(),
  }

  const startPicker = datepicker($startDate, datepickerOptions)
  const endPicker = datepicker($endDate, datepickerOptions)
  isDatepickerInited = true
}

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

function showDatepicker() {
  $datepicker.classList.remove("hide")
}

function hideDatepicker() {
  $datepicker.classList.add("hide")
}

// BATCH PROCESSING

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
      : `?$select=birthdate,emailaddress1,firstname,lastname,gendercode&$filter=birthdate ne null and nw_last_birthday_congrat eq null`

    return new Promise((resolve, reject) => {
      Xrm.WebApi.retrieveMultipleRecords("contact", query).then(
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

      const emailResponse = await GlobalHelper.sendCongratulationEmail({
        firstname,
        lastname,
        email,
        genderValue,
      })
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

function updateLastBirthdayCongratField(id, date) {
  return new Promise((res, rej) => {
    Xrm.WebApi.updateRecord("contact", id, {
      nw_last_birthday_congrat: date,
    }).then(
      function success() {
        res("Contact updated!")
      },
      function error(err) {
        rej(err)
      }
    )
  })
}

function cancelProcessing() {
  const confirmation = confirm(i18next.t("alerts.cancel"))

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
      $progressStatus.innerHTML = i18next.t("progress-bar.empty")
      return
    }

    const regularStatus = i18next.t("progress-bar.status", {
      processedContacts,
      totalContacts,
    })
    const lastStatus = i18next.t("progress-bar.finalStatus", {
      processedContacts,
      successfullContacts,
      failedContacts,
    })
    const status = isLast ? lastStatus : regularStatus

    $progressStatus.innerHTML = status
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

function clearProgressBar() {
  $progressStatus.innerHTML = ""
  $progressIndicator.style.setProperty("--progress", 0)
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

// INTERNATIONALIZATION

async function initI18n() {
  const mapCodeToLng = {
    1049: "ru",
    1033: "en",
    2057: "en",
    3081: "en",
    4105: "en",
    5129: "en",
    6153: "en",
    7177: "en",
    8201: "en",
    9225: "en",
    10249: "en",
    11273: "en",
    12297: "en",
    13321: "en",
    14345: "en",
    15369: "en",
    16393: "en",
    17417: "en",
    18441: "en",
  }
  const mapLngToPath = {
    ru: "/_webresources/nw_/Translations/BatchBirthdayCongratulation/ru",
    en: "/_webresources/nw_/Translations/BatchBirthdayCongratulation/en",
  }
  const { userSettings } = Xrm.Utility.getGlobalContext()
  const lng = mapCodeToLng[userSettings?.languageId || 1033]
  const path = mapLngToPath[lng]

  const response = await fetch(path)
  const xmlString = await response.text()

  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(xmlString, "application/xml")
  const translation = await xmlToJson(xmlDoc.documentElement)

  i18next.init({
    lng,
    interpolation: {
      escapeValue: false,
    },
    fallbackLng: "en",
    resources: {
      [lng]: {
        translation,
      },
    },
  })
}

// UI

function renderText() {
  $templateText.innerHTML = i18next.t("template.text")
  $templateSelectPlaceholder.innerHTML = i18next.t("template.placeholder")
  $datepickerTitle.innerHTML = i18next.t("datepicker.title")
  $datepickerLabelStart.innerHTML = i18next.t("datepicker.label-start")
  $datepickerLabelEnd.innerHTML = i18next.t("datepicker.label-end")
  $startBtn.innerHTML = i18next.t("btns.start")
  $cancelBtn.innerHTML = i18next.t("btns.cancel")
}

// UTILS

function capitalize(str) {
  return str[0].toUpperCase() + str.slice(1)
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

function xmlToJson(xml) {
  let obj = {}

  if (xml.nodeType === 1 && xml.hasChildNodes()) {
    for (let i = 0; i < xml.childNodes.length; i++) {
      let child = xml.childNodes[i]

      if (child.nodeType === 3 && child.nodeValue.trim() === "") continue

      let childName = child.nodeName

      if (child.nodeType === 3) {
        return child.nodeValue.trim()
      }

      if (typeof obj[childName] === "undefined") {
        obj[childName] = xmlToJson(child)
      } else {
        if (!Array.isArray(obj[childName])) {
          obj[childName] = [obj[childName]]
        }
        obj[childName].push(xmlToJson(child))
      }
    }
  }

  return obj
}
