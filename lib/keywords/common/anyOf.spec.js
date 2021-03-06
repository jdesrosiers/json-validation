const { expect, use } = require("chai");
const chaiAsPromised = require("chai-as-promised");
const { loadDoc, testDomain } = require("../../test-utils.spec");
const Hyperjump = require("@hyperjump/browser");
const Validation = require("../..");


use(chaiAsPromised);

describe("Hyperjump Validation", () => {
  describe("an invalid anyOf value", () => {
    it("should raise an error", async () => {
      const url = "/invalid-anyOf-keyword";
      loadDoc(url, {
        "$meta": { "$href": "http://validation.hyperjump.io/common" },
        "anyOf": {}
      });
      const doc = Hyperjump.fetch(testDomain + url);

      await expect(Validation.validate(doc))
        .to.be.rejectedWith([["/allOf", false]]);
    });

    it("should raise an error", async () => {
      const url = "/invalid-anyOf-keyword-2";
      loadDoc(url, { "anyOf": [{}, "foo"] });
      const doc = Hyperjump.fetch(testDomain + url);

      await expect(Validation.validate(doc))
        .to.be.rejectedWith([["/anyOf", false]]);
    });

    it("should raise an error", async () => {
      const url = "/invalid-anyOf";
      loadDoc(url, {
        "$meta": { "$href": "http://validation.hyperjump.io/common" },
        "anyOf": [{ "type": "foo" }]
      });
      const doc = Hyperjump.fetch(testDomain + url);

      await expect(Validation.validate(doc))
        .to.be.rejectedWith([["/anyOf", false]]);
    });
  });

  describe("anyOf", () => {
    let validate;

    before(async () => {
      const url = "/anyOf";
      loadDoc(url, {
        "$meta": { "$href": "http://validation.hyperjump.io/common" },
        "anyOf": [
          { "minimum": 4 },
          { "multipleOf": 2 }
        ]
      });
      const doc = Hyperjump.fetch(testDomain + url);
      validate = await Validation.validate(doc);
    });

    it("first anyOf valid", async () => {
      const result = await validate(5);
      expect(Validation.isValid(result)).to.eql(true);
    });

    it("second anyOf valid", async () => {
      const result = await validate(2);
      expect(Validation.isValid(result)).to.eql(true);
    });

    it("both anyOf valid", async () => {
      const result = await validate(6);
      expect(Validation.isValid(result)).to.eql(true);
    });

    it("neither anyOf valid", async () => {
      const result = await validate(3);
      expect(Validation.isValid(result)).to.eql(false);
    });
  });

  describe("anyOf with base", () => {
    let validate;

    before(async () => {
      const url = "/anyOf-with-base";
      loadDoc(url, {
        "$meta": { "$href": "http://validation.hyperjump.io/common" },
        "type": "string",
        "anyOf": [
          { "maxLength": 2 },
          { "minLength": 4 }
        ]
      });
      const doc = Hyperjump.fetch(testDomain + url);
      validate = await Validation.validate(doc);
    });

    it("one anyOf valid", async () => {
      const result = await validate("foobar");
      expect(Validation.isValid(result)).to.eql(true);
    });

    it("both anyOf invalid", async () => {
      const result = await validate("foo");
      expect(Validation.isValid(result)).to.eql(false);
    });
  });

  describe("anyOf complex types", () => {
    let validate;

    before(async () => {
      const url = "/anyOf-complex-types";
      loadDoc(url, {
        "$meta": { "$href": "http://validation.hyperjump.io/common" },
        "anyOf": [
          {
            "properties": {
              "bar": { "type": "number" }
            },
            "required": ["bar"]
          },
          {
            "properties": {
              "foo": { "type": "string" }
            },
            "required": ["foo"]
          }
        ]
      });
      const doc = Hyperjump.fetch(testDomain + url);
      validate = await Validation.validate(doc);
    });

    it("first anyOf valid (complex)", async () => {
      const result = await validate({ "bar": 2 });
      expect(Validation.isValid(result)).to.eql(true);
    });

    it("second anyOf invalid (complex)", async () => {
      const result = await validate({ "foo": "baz" });
      expect(Validation.isValid(result)).to.eql(true);
    });

    it("both anyOf invalid (complex)", async () => {
      const result = await validate({ "foo": "baz", "bar": 2 });
      expect(Validation.isValid(result)).to.eql(true);
    });

    it("neither anyOf invalid (complex)", async () => {
      const result = await validate({ "foo": 2, "bar": "quux" });
      expect(Validation.isValid(result)).to.eql(false);
    });
  });
});
