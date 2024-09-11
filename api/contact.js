const ContactApi = {
  async fetchGenderByFullName(firstName, lastName) {
    const response = await fetch("https://v2.namsor.com/NamSorAPIv2/api2/json/genderBatch", {
      method: "POST",
      headers: {
        "X-API-KEY": NAMSOR_API_KEY,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalNames: [
          {
            firstName,
            lastName,
          },
        ],
      }),
    })

    if (!response.ok) {
      throw new Error(response)
    }

    return response.json()
  },
}
