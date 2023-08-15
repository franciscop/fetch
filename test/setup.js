// Allow for fetch() mock to handle streams
// https://github.com/jefflau/jest-fetch-mock/issues/113#issuecomment-1418504168
import { Readable } from "stream";
class TempResponse extends Response {
  constructor(...args) {
    if (args[0] instanceof ReadableStream) {
      args[0] = Readable.from(args[0]);
    }
    super(...args);
  }
}
if (!global.Response) {
  Object.defineProperty(global, "Response", {
    value: TempResponse,
  });
}

if (!global.SubmitEvent) {
  Object.defineProperty(global, "SubmitEvent", {
    value: function SubmitEvent() {},
  });
}
if (!global.HTMLFormElement) {
  Object.defineProperty(global, "HTMLFormElement", {
    value: function HTMLFormElement() {},
  });
}
