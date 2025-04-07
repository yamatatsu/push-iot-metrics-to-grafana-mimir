import { handler } from "../src/app.Function";

handler({
  deviceId: "test_device_A",
  label: "rpm",
  value: Math.random() * 100,
}).then((res) => {
  console.log(res);
}, (err) => {
  console.error(err);
});
