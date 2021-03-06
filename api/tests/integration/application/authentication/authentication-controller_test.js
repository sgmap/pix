const { knex, sinon, expect } = require('../../../test-helper');

const faker = require('faker');
const server = require('../../../../server');
const { toLower } = require('lodash');

const authenticationController = require('../../../../lib/application/authentication/authentication-controller');
const BookshelfUser = require('../../../../lib/infrastructure/data/user');

describe('Unit | Controller | authentication-controller', () => {

  const password = 'A124B2C3#!';
  const userEmail = 'emailWithSomeCamelCase@example.net';
  const userEmailSavedInDb = toLower(userEmail);
  let replyStub;
  let codeStub;
  let user;

  before(() => {
    return new BookshelfUser({
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName(),
      email: userEmailSavedInDb,
      password,
      cgu: true
    }).save().then((createdUser) => {
      user = createdUser;
    });
  });

  after(() => {
    return knex('users').delete();
  });

  beforeEach(() => {
    codeStub = sinon.stub();
    replyStub = sinon.stub().returns({
      code: codeStub
    });
  });

  after((done) => {
    server.stop(done);
  });

  describe('#save', () => {

    function _buildRequest(email, password) {
      return {
        payload: {
          data: {
            attributes: {
              email, password
            }
          }
        }
      };
    }

    it('should return an 400 error when account does not exist', () => {
      // given
      const email = 'email-that-does-not-exist@example.net';
      const request = _buildRequest(email, password);

      // when
      const promise = authenticationController.save(request, replyStub);

      // then
      return promise.then(() => {
        sinon.assert.calledOnce(replyStub);
        sinon.assert.calledWith(codeStub, 400);
      });
    });

    it('should return an error message', () => {
      // given
      const email = 'email-that-does-not-exist@example.net';
      const request = _buildRequest(email, password);

      // when
      const promise = authenticationController.save(request, replyStub);

      // then
      return promise.then(() => {
        sinon.assert.calledWith(codeStub, 400);
        expect(replyStub.getCall(0).args).to.deep.equal([{
          errors: [{
            'status': '400',
            'title': 'Invalid Payload',
            'detail': 'L\'adresse e-mail et/ou le mot de passe saisi(s) sont incorrects.',
            'source': {
              'pointer': '/data/attributes'
            }
          }]
        }]);
      });
    });

    it('should return an 201 when account exists', () => {
      // given
      const password = 'A124B2C3#!';
      const request = _buildRequest(user.get('email'), password);

      // when
      const promise = authenticationController.save(request, replyStub);

      // then
      return promise.then(() => {
        sinon.assert.calledOnce(replyStub);
        sinon.assert.calledOnce(codeStub);
        sinon.assert.calledWith(codeStub, 201);
      });
    });

    it('should return an 400 error when account exists but wrong password', () => {
      // given
      const password = 'BZU#!1344B2C3';
      const request = _buildRequest(user.get('email'), password);

      // when
      const promise = authenticationController.save(request, replyStub);

      // then
      return promise.then(() => {
        sinon.assert.calledOnce(replyStub);
        sinon.assert.calledOnce(codeStub);
        sinon.assert.calledWith(codeStub, 400);
      });
    });
  });
});
