const { expect, knex, nock } = require('../../test-helper');
const server = require('../../../server');
const Answer = require('../../../lib/infrastructure/data/answer');

describe('Acceptance | Controller | answer-controller-save', () => {

  describe('POST /api/answers', () => {

    before(() => {
      nock('https://api.airtable.com')
        .get('/v0/test-base/Epreuves/a_challenge_id')
        .query(true)
        .times(5)
        .reply(200, {
          'id': 'a_challenge_id',
          'fields': {
            'Type d\'épreuve': 'QCU',
            'Bonnes réponses': '1'
            //other fields not represented
          }
        });
    });

    after(() => {
      nock.cleanAll();
    });

    afterEach(() => {
      return knex('answers').delete();
    });

    describe('when the save succeeds', () => {

      let options;

      beforeEach(() => {
        options = {
          method: 'POST',
          url: '/api/answers',
          payload: {
            data: {
              type: 'answer',
              attributes: {
                value: '1',
                'elapsed-time': 100
              },
              relationships: {
                assessment: {
                  data: {
                    type: 'assessment',
                    id: 'assessment_id'
                  }
                },
                challenge: {
                  data: {
                    type: 'challenge',
                    id: 'a_challenge_id'
                  }
                }
              }
            }
          },
        };
      });

      it('should return 201 HTTP status code', () => {
        // when
        const promise = server.inject(options);

        // then
        return promise.then((response) => {
          expect(response.statusCode).to.equal(201);
        });
      });

      it('should return application/json', () => {
        // when
        const promise = server.inject(options);

        // then
        return promise.then(response => {
          const contentType = response.headers['content-type'];
          expect(contentType).to.contain('application/json');
        });
      });

      it('should add a new answer into the database', () => {
        // when
        const promise = server.inject(options);

        // then
        return promise
          .then(() => Answer.count())
          .then((afterAnswersNumber) => {
            expect(afterAnswersNumber).to.equal(1);
          });
      });

      it('should return persisted answer', () => {
        // when
        const promise = server.inject(options);

        // then
        return promise.then(response => {
          const answer = response.result.data;

          new Answer().fetch()
            .then((model) => {
              expect(model.id).to.be.a('number');
              expect(model.get('value')).to.equal(options.payload.data.attributes.value);
              expect(model.get('result')).to.equal('ok');
              expect(model.get('resultDetails')).to.equal('null\n');
              expect(model.get('assessmentId')).to.equal(options.payload.data.relationships.assessment.data.id);
              expect(model.get('challengeId')).to.equal(options.payload.data.relationships.challenge.data.id);

              expect(answer.id).to.equal(model.id);
              expect(answer.id).to.equal(response.result.data.id);
              expect(answer.attributes.value).to.equal(model.get('value'));
              expect(answer.attributes.result).to.equal(model.get('result'));
              expect(answer.attributes['result-details']).to.equal(model.get('resultDetails'));
              expect(answer.relationships.assessment.data.id).to.equal(model.get('assessmentId'));
              expect(answer.relationships.challenge.data.id).to.equal(model.get('challengeId'));
            });
        });
      });

      it('should return persisted answer with elapsedTime', () => {
        // when
        const promise = server.inject(options);

        // then
        return promise.then(() => {
          new Answer()
            .fetch()
            .then((model) => {
              expect(model.get('elapsedTime')).to.equal(options.payload.data.attributes['elapsed-time']);
            });
        });
      });

      it('should persist long text for column "answers.value"', () => {
        // given
        options.payload.data.attributes.value = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?';

        // when
        const promise = server.inject(options);

        return promise
          .then(() => Answer.count())
          .then(afterAnswersNumber => {
            expect(afterAnswersNumber).to.equal(1);
          });
      });
    });

    describe('when attempting to POST on an existing record', () => {
      let options;
      let existingAnswerId;

      const existingAnswer = {
        value: '2',
        challengeId: 'a_challenge_id',
        assessmentId: 'assessment_id'
      };

      beforeEach(() => {
        return knex('answers').insert([existingAnswer])
          .then((id) => {
            existingAnswerId = id;
            options = {
              method: 'POST',
              url: '/api/answers',
              payload: {
                data: {
                  type: 'answer',
                  id: existingAnswerId,
                  attributes: {
                    value: '1',
                  },
                  relationships: {
                    assessment: {
                      data: {
                        type: 'assessment',
                        id: 'assessment_id'
                      }
                    },
                    challenge: {
                      data: {
                        type: 'challenge',
                        id: 'a_challenge_id'
                      }
                    }
                  }
                }
              },
            };
          });
      });

      it('should return a 409 HTTP status code', () => {
        // when
        const promise = server.inject(options);

        // then
        return promise.then((response) => {
          expect(response.statusCode).to.equal(409);
        });
      });
    });
  });
});
