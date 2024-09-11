var Contact = {
  onFormSave(executionContext) {
    const formContext = executionContext.getFormContext()
    const eventArgs = executionContext.getEventArgs()
    const birthdayAttr = formContext.getAttribute("birthdate")
    const birthdayValue = birthdayAttr.getValue()
    const firstName = formContext.getAttribute("firstname").getValue()
    const lastName = formContext.getAttribute("lastname").getValue()
    const email = formContext.getAttribute("emailaddress1").getValue()
    const genderValue = formContext.getAttribute("gendercode").getValue()
    const lastCongratDateAttr = formContext.getAttribute("nw_last_birthday_congrat")
    const isBirthdayFieldDirty = birthdayAttr.getIsDirty()

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
        genderValue,
        email,
      })
      lastCongratDateAttr.setValue(new Date())
    }
  },
}
