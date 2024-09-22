const GlobalHelper = window.GlobalHelper || {}

;(async function () {
  const flowUrl =
    "https://prod-28.uksouth.logic.azure.com:443/workflows/839b15640cd145a1ad85bcf9bb16f3a9/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=mnfdCZIsyVD4f9CI1qOUlqx6GXMH9x92Ojic4p8QIaY"

  const languageMap = {}

  const genderMap = {
    1: "male",
    2: "female",
  }

  const salutations = {
    en: {
      male: "Mr.",
      female: "Ms.",
    },
    de: {
      male: "Herr",
      female: "Frau",
    },
  }

  await setLanguageOptions()

  this.sendCongratulationEmail = async function (config) {
    const { email, firstName, lastName, genderValue, language, templateTypeValue } = config

    if (!email) return

    const salutation = salutations[language][genderMap[genderValue]]

    const { nw_text: templateText, nw_name: subject } = await getEmailTemplate(
      languageMap[language],
      templateTypeValue
    )
    const emailBody = parseTemplate(templateText, { salutation, firstName, lastName })

    const response = await fetch(flowUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        subject,
        body: emailBody,
      }),
    })

    if (!response.ok) throw new Error(response.statusText)
  }

  function getEmailTemplate(language, type) {
    console.log("Language: ", language, "Type: ", type)

    return new Promise((resolve, reject) => {
      Xrm.WebApi.retrieveMultipleRecords(
        "nw_emailtemplate",
        `?$select=nw_text,nw_name&$filter=nw_language eq ${language} and nw_type eq ${type}`
      ).then(
        function success(result) {
          resolve(result.entities[0])
        },
        function reject(err) {
          console.error(err)
          reject(err)
        }
      )
    })
  }

  async function setLanguageOptions() {
    const entityLogicalName = "nw_emailtemplate"
    const attributeLogicalName = "nw_language"

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
      const { Value, ExternalValue } = option
      languageMap[ExternalValue] = Value
    })
  }

  function parseTemplate(str, data) {
    const { salutation, firstName, lastName } = data

    return str
      .replace(/{salutation}/, salutation)
      .replace(/{first_name}/, firstName)
      .replace(/{last_name}/, lastName)
  }
}).call(GlobalHelper)
