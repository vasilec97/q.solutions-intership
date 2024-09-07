var Contact = {
  onFormSave(executionContext) {
    const formContext = executionContext.getFormContext()
    const eventArgs = executionContext.getEventArgs()
    const birthdayAttr = formContext.getAttribute("birthdate")
    const birthdayValue = birthdayAttr.getValue()
    const isBirthdayFieldDirty = birthdayAttr.getIsDirty()

    if (!ContactHelper.isValidBirthday(birthdayValue)) {
      eventArgs.preventDefault()
      alert("Birthday must be no earlier than 01/01/1990 and no later than the current date")
      return
    }

    if (isBirthdayFieldDirty && ContactHelper.isBirthdayToday(birthdayValue)) {
      ContactHelper.sendEmail(formContext)
    }
  },
}
