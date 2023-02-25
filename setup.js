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
Object.defineProperty(global, "Response", {
  value: TempResponse,
});
