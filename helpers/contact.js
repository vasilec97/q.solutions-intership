var ContactHelper = {
  isValidBirthday(currentDate) {
    const validBirhdayTime = new Date(1990, 0, 1).getTime()
    const currentDateTime = currentDate.getTime()

    return (isBirhdayValid = currentDateTime >= validBirhdayTime && currentDateTime < Date.now())
  },
  isBirthdayToday(currentDate) {
    const todayDate = new Date()

    return (
      currentDate.getMonth() === todayDate.getMonth() &&
      currentDate.getDate() === todayDate.getDate()
    )
  },
}
