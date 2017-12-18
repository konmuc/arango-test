'use strict';

const createRouter = require('@arangodb/foxx/router');
const joi = require('joi');

const db = require('@arangodb').db;
const errors = require('@arangodb').errors;
const foxxColl = db._collection('myFoxxCollection');
const DOC_NOT_FOUND = errors.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code;

const router = createRouter();

const docSchema = joi.object().required().keys({
    name: joi.string().required(),
    age: joi.number().required()
}).unknown();

const aql = require('@arangodb').aql;

router.get('/entries', function (req, res) {
    const keys = db._query(aql`
    FOR entry IN ${foxxColl}
    RETURN entry
`);
    res.send(keys);
})
    .response(joi.array().items(
        joi.string().required()
    ).required(), 'List of entry keys.')
    .summary('List entry keys')
    .description('Assembles a list of keys of entries in the collection.');


router.post('/entries', (req, res) => {
    const multiple = Array.isArray(req.body);
    const body = multiple ? req.body : [req.body];

    let data = [];
    for (var doc of body) {
        const meta = foxxColl.save(doc);
        data.push(Object.assign(doc, meta));
    }
    res.send(multiple ? data : data[0]);
})
    .body(joi.alternatives().try(
        docSchema,
        joi.array().items(docSchema)
    ), 'Entry or entries to store in the collection.')
    .response(joi.alternatives().try(
        joi.object().required(),
        joi.array().items(joi.object().required())
    ), 'Entry or entries stored in the collection.')
    .summary('Store entry or entries')
    .description('Store a single entry or multiple entries in the "myFoxxCollection" collection.');

router.get('/entries/:key', function (req, res) {
    try {
        const data = foxxColl.document(req.pathParams.key);
        res.send(data)
    } catch (e) {
        if (!e.isArangoError || e.errorNum !== DOC_NOT_FOUND) {
            throw e;
        }
        res.throw(404, 'The entry does not exist', e);
    }
})
    .pathParam('key', joi.string().required(), 'Key of the entry.')
    .response(joi.object().required(), 'Entry stored in the collection.')
    .summary('Retrieve an entry')
    .description('Retrieves an entry from the "myFoxxCollection" collection by key.');

module.context.use(router);