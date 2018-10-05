/* tslint:disable:no-unused-expression no-empty */
import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import { MessageProviderPact } from "./messageProviderPact";
import { fail } from "assert";
import { Message } from "./dsl/message";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import * as express from "express";
import * as http from "http";

chai.use(sinonChai);
chai.use(chaiAsPromised);

const expect = chai.expect;
const assert = chai.assert;

describe("MesageProvider", () => {
  let provider: MessageProviderPact;
  const successfulRequest = "successfulRequest";
  const unsuccessfulRequest = "unsuccessfulRequest";

  const successfulMessage: Message = {
    contents: { foo: "bar" },
    description: successfulRequest,
    providerStates: [{ name: "some state" }],
  };

  const unsuccessfulMessage: Message = {
    contents: { foo: "bar" },
    description: unsuccessfulRequest,
    providerStates: [{ name: "some state not found" }],
  };
  const nonExistentMessage: Message = {
    contents: { foo: "bar" },
    description: "does not exist",
    providerStates: [{ name: "some state not found" }],
  };

  beforeEach(() => {
    provider = new MessageProviderPact({
      consumer: "myconsumer",
      logLevel: "error",
      messageProviders: {
        successfulRequest: () => Promise.resolve("yay"),
        unsuccessfulRequest: () => Promise.reject("nay"),
      },
      provider: "myprovider",
      stateHandlers: {
        "some state": () => Promise.resolve("yay"),
      },
    });
  });

  describe("#constructor", () => {
    it("creates a Provider when all mandatory parameters are provided", () => {
      expect(provider).to.be.a("object");
      expect(provider).to.respondTo("verify");
    });
    it("creates a Provider with default log level if not specified", () => {
      provider = new MessageProviderPact({
        consumer: "myconsumer",
        messageProviders: {},
        provider: "myprovider",
      });
      expect(provider).to.be.a("object");
      expect(provider).to.respondTo("verify");
    });
  });

  // describe("#verify", () => {
  //   describe("when given a valid handler and message", () => {
  //     it("should successfully verify the Provider message", () => {
  //       const stub = new MessageProvider({
  //         Provider: "myProvider",
  //         provider: "myprovider",
  //       });
  //       sinon.stub(stub, "getServiceFactory").returns({
  //         createMessage: (opts: any) => Promise.resolve("message created"),
  //       });

  //       stub
  //         .given("some state")
  //         .expectsToReceive("A message about something")
  //         .withContent({ foo: "bar" })
  //         .withMetadata({ baz: "bat" });

  //       return expect(stub.verify((m: Message) => Promise.resolve("yay!"))).to.eventually.be.fulfilled;
  //     });
  //   });
  // });

  describe("#setupVerificationHandler", () => {
    describe("when their is a valid setup", () => {
      it("should create a valid express handler", (done) => {
        const setupVerificationHandler = (provider as any).setupVerificationHandler.bind(
          provider,
        )();
        const req = { body: successfulMessage };
        const mock = sinon.stub();
        const res = {
          json: () => done(), // Expect a response
        };

        setupVerificationHandler(req, res);
      });
    });
    describe("when their is an invalid setup", () => {
      it("should create a valid express handler that rejects the message", (done) => {
        const setupVerificationHandler = (provider as any).setupVerificationHandler.bind(
          provider,
        )();
        const req = { body: nonExistentMessage };
        const mock = sinon.stub();
        const res = {
          status: (status: number) => {
            expect(status).to.eq(500);

            return {
              send: () => done(), // Expect the status to be called with 500
            };
          },
        };

        setupVerificationHandler(req, res);
      });
    });
  });

  describe("#findHandler", () => {
    describe("when given a handler that exists", () => {
      it("should return a Handler object", () => {
        const findHandler = (provider as any).findHandler.bind(provider);
        return expect(findHandler(successfulMessage)).to.eventually.be.a("function");
      });
    });
    describe("when given a handler that does not exist", () => {
      it("should return a failed promise", () => {
        const findHandler = (provider as any).findHandler.bind(provider);
        return expect(findHandler("doesnotexist")).to.eventually.be.rejected;
      });
    });
  });

  describe("#setupStates", () => {
    describe("when given a handler that exists", () => {
      it("should return values of all resolved handlers", () => {
        const findStateHandler = (provider as any).setupStates.bind(provider);
        return expect(
          findStateHandler(successfulMessage),
        ).to.eventually.deep.equal(["yay"]);
      });
    });
    describe("when given a state that does not have a handler", () => {
      it("should return an empty promise", () => {
        provider = new MessageProviderPact({
          consumer: "myconsumer",
          messageProviders: {},
          provider: "myprovider",
        });
        const findStateHandler = (provider as any).setupStates.bind(provider);
        return expect(
          findStateHandler(unsuccessfulMessage),
        ).to.eventually.deep.equal([]);
      });
    });
  });

  describe("#waitForServerReady", () => {
    describe("when the http server starts up", () => {
      it("should return a resolved promise", () => {
        const waitForServerReady = (provider as any).waitForServerReady;
        const server = http.createServer(() => { }).listen();

        return expect(waitForServerReady(server)).to.eventually.be.fulfilled;
      });
    });
  });
  describe("#setupProxyServer", () => {
    describe("when the http server starts up", () => {
      it("should return a resolved promise", () => {
        const setupProxyServer = (provider as any).setupProxyServer;
        const app = express();

        expect(setupProxyServer(app)).to.be.an.instanceOf(http.Server);
      });
    });
  });
  describe("#setupProxyApplication", () => {
    it("should return a valid express app", () => {
      const setupProxyApplication = (provider as any).setupProxyApplication.bind(
        provider,
      );
      expect(setupProxyApplication().listen).to.be.a("function");
    });
  });
});
