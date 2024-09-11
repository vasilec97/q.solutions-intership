const genderMap = {
  1: "male",
  2: "female",
}

const GlobalHelper = {
  sendCongratulationEmail(config) {
    const { email, firstName, lastName, genderValue } = config

    const fullName = `${firstName} ${lastName}`
    const appeal =
      genderMap[genderValue] === "male"
        ? `Sehr geehrter Herr ${fullName}`
        : `Sehr geehrte Frau ${fullName}`

    console.log("Appeal: ", appeal)

    if (!email) return

    return Email.send({
      SecureToken: "3dac010a-4bea-4187-9b8a-d630ac47693c",
      From: "vasilechek9786@gmail.com",
      To: email,
      Subject: "Alles Gute zum Geburtstag!",
      Body: `${appeal}, wir gratulieren Ihnen zu Ihrem Geburtstag und wünschen Ihnen alles Gute!`,
    })
  },
}
