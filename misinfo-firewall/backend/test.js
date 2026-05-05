const { checkMessage } = require("./index");

const mockReq = {
  method: "POST",
  body: {
    message: "Drinking hot water with lemon cures COVID-19 and kills the virus instantly. Share this with everyone!"
  }
};

const mockRes = {
  set: () => {},
  status: (code) => ({ json: (data) => console.log("STATUS:", code, "\nRESPONSE:", JSON.stringify(data, null, 2)) }),
  send: () => {}
};

checkMessage(mockReq, mockRes);