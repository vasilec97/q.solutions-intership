var Contact = {
  async onFormSave(executionContext) {
    // await handleGender(executionContext)
    // handleBirthday(executionContext)

    const formContext = executionContext.getFormContext()
    const genderAttribute = formContext.getAttribute("gendercode")
    const genderValue = genderAttribute.getValue()
    const firstName = formContext.getAttribute("firstname").getValue()
    const lastName = formContext.getAttribute("lastname").getValue()
    const eventArgs = executionContext.getEventArgs()
    const birthdayAttr = formContext.getAttribute("birthdate")
    const birthdayValue = birthdayAttr.getValue()
    const email = formContext.getAttribute("emailaddress1").getValue()
    const lastCongratDateAttr = formContext.getAttribute("nw_last_birthday_congrat")
    const isBirthdayFieldDirty = birthdayAttr.getIsDirty()
    const { languageId } = Xrm.Utility.getGlobalContext().userSettings
    const language = mapCodeToLng[languageId]
    const birthdayTypeValue = 125050000

    // SET GENDER

    if (!genderValue) {
      try {
        const data = await ContactApi.fetchGenderByFullName(firstName, lastName)
        const likelyGender = data.personalNames[0].likelyGender
        const newGenderValue = likelyGender == "male" ? 1 : 2

        genderAttribute.setValue(newGenderValue)
      } catch (err) {
        console.error(err)
      }
    }

    // VALIDATE BIRTHDAY AND SEND CONGRATULATIONS

    if (!isBirthdayFieldDirty) return

    if (!ContactHelper.isValidBirthday(birthdayValue)) {
      eventArgs.preventDefault()
      alert("Birthday must be no earlier than 01/01/1990 and no later than the current date")
      return
    }

    if (ContactHelper.isBirthdayToday(birthdayValue)) {
      GlobalHelper.sendCongratulationEmail({
        firstName,
        lastName,
        email,
        genderValue: genderAttribute.getValue(),
        templateTypeValue: birthdayTypeValue,
        language,
      }).then((message) => {
        alert(message)
        alert(`A message has been sent to "${email}", check your email!`)
      })
      lastCongratDateAttr.setValue(new Date())
    }
  },
}

// async function handleGender(executionContext) {
//   const formContext = executionContext.getFormContext()
//   const genderAttribute = formContext.getAttribute("gendercode")
//   const genderValue = genderAttribute.getValue()
//   const firstName = formContext.getAttribute("firstname").getValue()
//   const lastName = formContext.getAttribute("lastname").getValue()

//   if (genderValue) return

//   try {
//     const data = await ContactApi.fetchGenderByFullName(firstName, lastName)
//     const likelyGender = data.personalNames[0].likelyGender
//     const newGenderValue = likelyGender == "male" ? 1 : 2

//     genderAttribute.setValue(newGenderValue)
//   } catch (err) {
//     console.error(err)
//   }
// }

// function handleBirthday(executionContext) {
//   const formContext = executionContext.getFormContext()
//   const eventArgs = executionContext.getEventArgs()
//   const birthdayAttr = formContext.getAttribute("birthdate")
//   const birthdayValue = birthdayAttr.getValue()
//   const firstName = formContext.getAttribute("firstname").getValue()
//   const lastName = formContext.getAttribute("lastname").getValue()
//   const email = formContext.getAttribute("emailaddress1").getValue()
//   const genderValue = formContext.getAttribute("gendercode").getValue()
//   const lastCongratDateAttr = formContext.getAttribute("nw_last_birthday_congrat")
//   const isBirthdayFieldDirty = birthdayAttr.getIsDirty()

//   if (!isBirthdayFieldDirty) return

//   if (!ContactHelper.isValidBirthday(birthdayValue)) {
//     eventArgs.preventDefault()
//     alert("Birthday must be no earlier than 01/01/1990 and no later than the current date")
//     return
//   }

//   if (ContactHelper.isBirthdayToday(birthdayValue)) {
//     GlobalHelper.sendCongratulationEmail({
//       firstName,
//       lastName,
//       email,
//       genderValue,
//     }).then((message) => {
//       alert(message)
//       alert(`A message has been sent to "${email}", check your email!`)
//     })
//     lastCongratDateAttr.setValue(new Date())
//   }
// }
