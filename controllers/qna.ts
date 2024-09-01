import { badRequest, boomify } from '@hapi/boom';
import { type Response, Router } from 'express';
import authenticate, { type IUserRequest } from 'middleware/authMiddleware';
import path from 'path';
import wrapHandler from 'utils/wrapHandler';
import { z } from 'zod';
import fs from 'fs/promises';
import { redisClient } from 'utils/redisHelper';
import { nanoid } from 'nanoid';
import { decryptStarter, encryptStarter } from 'utils/encryptHelper';
import pino from 'utils/logHelper';

const LOG = 'STARTER_QNA_LOG:';
const router = Router();

const __getGameCollection = async (game_code: string) => {
  try {
    // Resolve the file path to the JSON file
    const filePath = path.resolve(__dirname, '../assets/game/quiz-cihuy.json');

    // Read the file
    const data = await fs.readFile(filePath, 'utf-8');

    // Parse the JSON data
    const gameCollections = JSON.parse(data);

    // Find the game collection with the matching game_code
    const gameCollection = gameCollections.find((game: { game_code: string }) => game.game_code === game_code);

    // Return the found game collection or throw an error if not found
    if (!gameCollection) {
      throw new Error(`Game with code ${game_code} not found`);
    }

    return gameCollection;
  } catch (error) {
    console.error(`${LOG} ERROR_READING_JSON ${error}`);
    throw new Error('Failed to read game collection');
  }
};

// get all game collections
const quizHub = async (_req: IUserRequest, res: Response) => {
  try {
    const filePath = path.resolve(__dirname, '../assets/game/quiz-cihuy.json');
    const data = await fs.readFile(filePath, 'utf-8');
    const gameCollections = JSON.parse(data);
    gameCollections.map((game: { game_question?: string }) => delete game.game_question);

    pino.logger.info(JSON.stringify('QUIZ_HUB: Get all game collections | ' + JSON.stringify(gameCollections)));
    return res.status(200).json({
      message: 'SUCCESS',
      data: gameCollections,
    });
  } catch (error: any) {
    console.error(`${LOG} QUIZ_HUB ${error}`);
    const err = boomify(error);
    return res.status(err.output.statusCode).send(err.output.payload);
  }
};

const getQuestions = async (req: IUserRequest, res: Response) => {
  try {
    const { user } = req;
    const { game_code, next, session_id } = req.body;

    const validation = z
      .object({
        game_code: z.string().min(3),
        next: z.boolean().optional(),
        session_id: z.string().optional(),
      })
      .safeParse({ game_code });

    if (!validation.success) {
      const formatted = validation.error.flatten();
      const simplifiedErrors: Record<string, string> = {};

      for (const key of Object.keys(formatted.fieldErrors)) {
        const errors = formatted.fieldErrors as Record<string, string[]>;
        simplifiedErrors[key] = errors[key][0];
      }

      console.error(`${LOG} GET_QUESTIONS ${JSON.stringify(simplifiedErrors)}`);

      const error = badRequest('Invalid validation!');
      return res.status(error.output.statusCode).json({
        statusCode: error.output.statusCode,
        error: error.output.payload.error,
        message: error.message,
        validation_error: simplifiedErrors,
      });
    }

    // find game by code in /assets/game/quiz-cihuy.json
    const gameCollection = await __getGameCollection(game_code);

    // get questions from the game collection, but check if there has questions json file
    if (!gameCollection.game_question) {
      throw badRequest('Questions not found');
    }

    // read the questions json file
    const questionsPath = path.resolve(__dirname, `../assets/game/${gameCollection.game_question}`);
    const questionsData = await fs.readFile(questionsPath, 'utf-8');
    // if file not found, throw an error
    if (!questionsData) {
      return res.send(badRequest('Questions not found'));
    }
    const questions = JSON.parse(questionsData);

    // Get the next question from the session
    if (next && session_id) {
      const decryptedSessionId = decryptStarter(session_id);
      const sessionData = await redisClient.get(`gameSession_${decryptedSessionId}`);
      if (!sessionData) {
        throw badRequest('Session not found');
      }

      const gameSession = JSON.parse(sessionData);
      console.log('gameSession --->', gameSession);

      // Get the next question
      const nextQuestionIndex = gameSession.currentQuestionIndex + 1;

      if (nextQuestionIndex >= gameSession.questions.length) {
        return res.status(200).json({
          message: 'GAME_COMPLETED',
          data: {
            points: gameSession.currentPoints || 0,
          },
        });
      }

      const nextQuestion = gameSession.questions[nextQuestionIndex];
      const nextQuestionTimestamp = Math.floor(Date.now() / 1000) + 15; // 15 seconds to answer each question
      const encryptedTimestamp = encryptStarter(nextQuestionTimestamp);

      // Update session with the new question index
      gameSession.currentQuestionIndex = nextQuestionIndex;
      gameSession.timestamps = nextQuestionTimestamp;
      await redisClient.set(`gameSession_${decryptedSessionId}`, JSON.stringify(gameSession));

      delete nextQuestion.correct;
      const data = {
        number_question: nextQuestionIndex + 1,
        total_questions: gameSession.questions.length,
        question: nextQuestion,
        timestamps: encryptedTimestamp,
        points: gameSession.currentPoints || 0,
      };

      return res.status(200).json({
        message: 'NEXT_QUESTION',
        data,
      });
    }

    // create a new game session and store it in Redis, make sure questions are shuffled and only show 1 question at a time
    // Shuffle questions
    const shuffledQuestions = questions.sort(() => Math.random() - 0.5);

    // shuffle options
    for (const question of shuffledQuestions) {
      question.options = question.options.sort(() => Math.random() - 0.5);
    }

    // Create a new game session with a unique ID
    const sessionId = nanoid();
    const timestamps = Math.floor(Date.now() / 1000) + 15; // 15 seconds to answer each question
    const gameSession = {
      game_code,
      questions: shuffledQuestions,
      currentQuestionIndex: 0,
      timestamps,
      player: {
        name: user.name,
        email: user.email,
      },
    };

    // Store the session in Redis
    await redisClient.set(`gameSession_${sessionId}`, JSON.stringify(gameSession), 'EX', 900); // 15 minutes to answer all questions

    // Return the first question
    const firstQuestion = shuffledQuestions[0];
    delete firstQuestion.correct;

    const encryptedSessionId = encryptStarter(sessionId);
    const encryptedTimestamp = encryptStarter(timestamps);

    const data = {
      session_id: encryptedSessionId,
      number_question: 1,
      total_questions: shuffledQuestions.length,
      question: firstQuestion,
      timestamps: encryptedTimestamp,
    };

    return res.status(200).json({
      message: 'LETS_PLAY',
      data,
    });
  } catch (error: any) {
    console.error(`${LOG} GET_QUESTIONS ${error}`);
    const err = boomify(error);
    return res.status(err.output.statusCode).send(err.output.payload);
  }
};

const submitAnswer = async (req: IUserRequest, res: Response) => {
  try {
    const { game_code, session_id, answer, timeAnswer } = req.body;
    const convertTimestamp = (timestampString: string): number => {
      const timestamp = Number(timestampString);
      if (isNaN(timestamp)) {
        throw new Error('Invalid timestamp format');
      }
      return timestamp;
    };
    const timestamp = convertTimestamp(timeAnswer);

    const validation = z
      .object({
        game_code: z.string().min(3),
        session_id: z.string(),
        answer: z.string(),
        timestamp: z.number(),
      })
      .safeParse({ game_code, session_id, answer, timestamp });

    if (!validation.success) {
      const formatted = validation.error.flatten();
      const simplifiedErrors: Record<string, string> = {};

      for (const key of Object.keys(formatted.fieldErrors)) {
        const errors = formatted.fieldErrors as Record<string, string[]>;
        simplifiedErrors[key] = errors[key][0];
      }

      console.error(`${LOG} SUBMIT_ANSWER ${JSON.stringify(simplifiedErrors)}`);

      const error = badRequest('Invalid validation!');
      return res.status(error.output.statusCode).json({
        statusCode: error.output.statusCode,
        error: error.output.payload.error,
        message: error.message,
        validation_error: simplifiedErrors,
      });
    }

    // find game by code in /assets/game/quiz-cihuy.json
    const gameCollection = await __getGameCollection(game_code);

    // get questions from the game collection, but check if there has questions json file
    if (!gameCollection.game_question) {
      throw badRequest('Questions not found');
    }

    const decryptedSessionId = decryptStarter(session_id);
    const sessionData = await redisClient.get(`gameSession_${decryptedSessionId}`);
    if (!sessionData) {
      throw badRequest('Session not found');
    }

    const gameSession = JSON.parse(sessionData);
    const currentQuestion = gameSession.questions[gameSession.currentQuestionIndex];

    if (currentQuestion.correct === answer) {
      // set points to the user in the session by timestamp
      // if the user answers correctly, add 10 points and if the remaining time is more than 10 seconds, add 5 points.
      // if the remaining time is less than 10 seconds, add 2 points.
      // if tthe remaining time is less than 5 seconds, don't add any points.
      // const remainingTime = gameSession.timestamps - Math.floor(Date.now() / 1000);
      const remainingTime = gameSession.timestamps - timestamp;
      console.log('remainingTime --->', remainingTime);
      let points = 10;
      if (remainingTime > 10) {
        points += 5;
      } else if (remainingTime > 5) {
        points += 2;
      }

      // Update the session with the new points
      gameSession.currentPoints = (gameSession.currentPoints || 0) + points;
      await redisClient.set(`gameSession_${decryptedSessionId}`, JSON.stringify(gameSession));

      return res.status(200).json({
        message: 'CORRECT_ANSWER',
        data: {
          points: gameSession.currentPoints,
        },
      });
    }

    return res.status(200).json({
      message: 'WRONG_ANSWER',
      data: {
        correct_answer: currentQuestion.correct,
        points: gameSession.currentPoints || 0,
      },
    });
  } catch (error: any) {
    console.error(`${LOG} SUBMIT_ANSWER ${error}`);
    const err = boomify(error);
    return res.status(err.output.statusCode).send(err.output.payload);
  }
};

router.get('/quiz-hub', authenticate, wrapHandler(quizHub));
router.post('/questions', authenticate, wrapHandler(getQuestions));
router.post('/questions-answer', authenticate, wrapHandler(submitAnswer));

export default router;
