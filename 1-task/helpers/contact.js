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
  sendEmail(formContext) {
    const email = formContext.getAttribute("emailaddress1").getValue()
    const firstName = formContext.getAttribute("firstname").getValue()
    const lastName = formContext.getAttribute("lastname").getValue()
    const fullName = `${firstName} ${lastName}`

    if (!email) return

    Email.send({
      SecureToken: "3dac010a-4bea-4187-9b8a-d630ac47693c",
      From: "vasilechek9786@gmail.com",
      To: email,
      Subject: "Happy birthday!",
      Body: `Hi ${fullName}, Happy Birthday and all the best!`,
    }).then((message) => {
      alert(message)
      alert(`A message has been sent to your email "${email}", check your email!`)
    })
  },
}
