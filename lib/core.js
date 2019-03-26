const JsonPointer = require("@hyperjump/json-pointer");
const JRef = require("@hyperjump/browser/json-reference");
const ValidationResult = require("./validation-result");
const { isType } = require("./common");


const compile = async (doc, ast) => {
  if (ast[doc.url] === undefined) {
    ast[doc.url] = false;

    const meta = await getMeta(doc);

    ast[doc.url] = await JRef.pipeline([
      JRef.entries,
      JRef.filter(([keyword]) => keyword !== "$meta"),
      JRef.map(async ([keyword, keywordDoc]) => {
        if (!(keyword in meta)) {
          throw Error(`Encountered undeclared keyword '${keyword}' at '${keywordDoc.url}'`);
        }

        const keywordUrl = meta[keyword];
        const node = await keywords[keywordUrl].compile(keywordDoc, ast);

        return [keywordUrl, keywordDoc.url, node];
      })
    ], doc);
  }

  return ast;
};

const metaAst = {};
const metaCompile = async (doc) => {
  const meta = await getMeta(doc);

  await Promise.all(Object.entries(meta)
    .filter(([keyword, keywordUrl]) => keyword[0] !== "$" && !(keywordUrl in metaAst))
    .map(async ([keyword, _]) => {
      const keywordUrl = meta[keyword];
      const metaDoc = await JRef.get(keywordUrl, JRef.nil);
      return await compile(metaDoc, metaAst);
    }));

  return meta;
};

const interpret = (ast, url) => (value) => {
  return ast[url].map(([keywordUrl, ptr, keywordValue]) => {
    const keyword = keywords[keywordUrl];
    const isValid = (keyword.type !== undefined && !isType[keyword.type](value)) || keywords[keywordUrl].interpret(keywordValue, value, ast);

    return [ptr, isValid];
  });
};

const metaInterpret = (meta, value) => {
  return Object.keys(value)
    .filter((keyword) => keyword in meta)
    .map((keyword) => {
      const keywordUrl = meta[keyword];
      const result = interpret(metaAst, keywordUrl)(value[keyword]);
      return [JsonPointer.append(keyword, JsonPointer.nil), ValidationResult.isValid(result)];
    });
};

const getMeta = async (doc) => {
  try {
    const $meta = await JRef.get("#/$meta", doc);
    return JRef.value($meta);
  } catch (e) {
    return {};
  }
};

const keywords = {};

const addKeyword = (url, keywordDefinition) => keywords[url] = keywordDefinition;

module.exports = { compile, metaCompile, interpret, metaInterpret, addKeyword };