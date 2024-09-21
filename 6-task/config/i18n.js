;(async function initTranslation() {
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
  const Xrm = window?.Xrm || window?.parent?.Xrm || window?.opener?.Xrm
  const { userSettings } = Xrm.Utility.getGlobalContext()
  const lng = mapCodeToLng[userSettings?.languageId || 1049]
  const path = mapLngToPath[lng]

  const response = await fetch(path)
  const xmlString = await response.text()

  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(xmlString, "application/xml")
  const translation = xmlToJson(xmlDoc.documentElement)

  i18next.init({
    lng,
    interpolation: {
      escapeValue: false,
    },
    fallbackLng: "ru",
    resources: {
      [lng]: {
        translation,
      },
    },
  })

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
})()
