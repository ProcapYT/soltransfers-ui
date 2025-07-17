const crypto = require("node:crypto");

const ALGORITHM = 'aes-256-cbc';

/**
 * 
 * @param {crypto.BinaryLike} password 
 * @returns {Buffer}
 */
function getKeyFromPassword(password) {
    return crypto.createHash('sha256').update(password).digest();
}

/**
 * 
 * @param {crypto.BinaryLike} password 
 * @returns {Buffer}
 */
function getIVFromPassword(password) {
    return crypto.createHash('md5').update(password).digest();
}

/**
 * 
 * @param {string} text 
 * @param {string} password 
 * @returns {string}
 */
function encrypt(text, password) {
    const key = getKeyFromPassword(password);
    const iv = getIVFromPassword(password);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const prefixedText = '__OK__:' + text;
    const encrypted = Buffer.concat([cipher.update(prefixedText, 'utf8'), cipher.final()]);
    return encrypted.toString('base64');
}

/**
 * 
 * @param {string} encryptedBase64 
 * @param {string} password 
 * @returns {string}
 */
function decrypt(encryptedBase64, password) {
    const key = getKeyFromPassword(password);
    const iv = getIVFromPassword(password);
    const encrypted = Buffer.from(encryptedBase64, 'base64');

    try {
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
        const result = decrypted.toString('utf8');

        if (!result.startsWith('__OK__:')) throw new Error("Wrong password");

        return result.slice('__OK__:'.length);
    } catch (e) {
        throw new Error("Wrong password");
    }
}

/**
 * 
 * @param {Object} jsonContent 
 * @param {string} password 
 * @returns {Object}
 */
function decodeJSON(jsonContent, password) {
    const decodedJson = decodeObject(jsonContent, password);

    return decodedJson;
}

/**
 * 
 * @param {Object} encodedObject 
 * @param {string} password 
 * @returns {Object}
 */
function decodeObject(encodedObject, password) {
    const decodedObject = {};

    for (const [key, value] of Object.entries(encodedObject)) {
        if (Array.isArray(value)) decodedObject[key] = decodeArray(value, password);
        else if (typeof value == "object") decodedObject[key] = decodeObject(value, password);
        else if (typeof value == "string") decodedObject[key] = decrypt(value, password);
        else decodedObject[key] = value;
    }

    return decodedObject;
}

/**
 * 
 * @param {Array} encodedArray 
 * @param {string} password 
 * @returns {Array}
 */
function decodeArray(encodedArray, password) {
    const decodedArray = [];

    for (const item of encodedArray) {
        if (Array.isArray(item)) decodedArray.push(decodeArray(item, password));
        else if (typeof item == "object") decodedArray.push(decodeObject(item, password));
        else if (typeof item == "string") decodedArray.push(decrypt(item, password));
        else decodedArray.push(item);
    }

    return decodedArray;
}

/**
 * 
 * @param {Object} jsonContent 
 * @param {string} password 
 * @returns {Object}
 */
function encodeJSON(jsonContent, password) {
    const encodedJson = encodeObject(jsonContent, password);

    return encodedJson;
}

/**
 * 
 * @param {Object} decodedObject 
 * @param {string} password 
 * @returns {Object}
 */
function encodeObject(decodedObject, password) {
    const encodedObject = {};

    for (const [key, value] of Object.entries(decodedObject)) {
        if (Array.isArray(value)) encodedObject[key] = encodeArray(value, password);
        else if (typeof value === "object" && value !== null) encodedObject[key] = encodeObject(value, password);
        else if (typeof value === "string") encodedObject[key] = encrypt(value, password);
        else encodedObject[key] = value;
    }

    return encodedObject;
}

/**
 * 
 * @param {Array} decodedArray 
 * @param {string} password 
 * @returns {Array}
 */
function encodeArray(decodedArray, password) {
    const encodedArray = [];

    for (const item of decodedArray) {
        if (Array.isArray(item)) encodedArray.push(encodeArray(item, password));
        else if (typeof item === "object" && item !== null) encodedArray.push(encodeObject(item, password));
        else if (typeof item === "string") encodedArray.push(encrypt(item, password));
        else encodedArray.push(item);
    }

    return encodedArray;
}

module.exports = { encrypt, decrypt, encodeJSON, decodeJSON };
