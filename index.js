
import express from 'express';
import bodyParser from 'body-parser';
import crypto from 'crypto';

import { ORDERS, USERS } from './db.js';


const app = express();
app.use(bodyParser.json());


app.listen(8080, () => {
    console.log(`Server was started`);
});

app.post('/users', (req, res) => {
    const { body } = req;
    console.log(`body`, body);
    const isUserExists = USERS.find(el => el.login === body.login);

    if (isUserExists) {
        return res.status(400).send({
            message: `User with login ${body.login} already exists`
        });
    }

    USERS.push(body);

    return res.status(200).send({ message: 'User was created' });
});


app.get('/users', (req, res) => {
    return res.status(200).send(USERS.data);
});


app.post('/login', (req, res) => {
    const { body } = req;

    const user = USERS
        .find(el => el.login === body.login && el.password === body.password);

    if (!user) {
        return res.status(400).send({ message: 'User was not found' });
    }

    const token = crypto.randomUUID();

    user.token = token;
    USERS.save(user.login, { token });

    return res.status(200).send({
        token,
        message: 'User was login'
    });
});

app.post('/orders', (req, res) => {
    const { body, headers } = req;

    const token = headers.authorization;

    if (!token) {
        return res.status(401).send();
    }

    const user = USERS.find(el => el.token === token);
    if (!user) {
        return res.status(400).send({
            message: "User was not found"
        });
    }

    const uniqueFromId = Math.floor(100 + Math.random() * 900);
    const fromAddress = `address${uniqueFromId}`;

    const uniqueToId = Math.floor(100 + Math.random() * 900);
    const toAddress = `address${uniqueToId}`;

    const price = Math.floor(Math.random() * (100 - 20 + 1)) + 20;

    const order = { ...body, from: fromAddress, to: toAddress, login: user.login, price: price };

    ORDERS.push(order);

    res.status(200).send({ order, message: "order was created" });
});

app.get('/orders', (req, res) => {
    const { headers } = req;

    const token = headers.authorization;

    if (!token) {
        return res.status(401).send();
    }

    const user = USERS.find(el => el.token === token);
    if (!user) {
        return res.status(400).send({
            message: "user was not found"
        });
    }

    const history = ORDERS.filter(el => el.login === user.login);

    return res.status(200).send(history);
});

const authorizationMiddleware = (req, res, next) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).send({ message: "Authorization token is missing" });
    }

    const user = USERS.find(user => user.token === token);
    if (!user) {
        return res.status(400).send({ message: `User was not found by token: ${token}` });
    }

    req.user = user;
    next();
};


app.get('/address/from/last-5', authorizationMiddleware, (req, res) => {
    const user = req.user;
    const userOrders = ORDERS.filter(order => order.login === user.login);
    const uniqueAddresses = [...new Set(userOrders.map(order => order.from))];
    const last5UniqueAddresses = uniqueAddresses.slice(-5);
    res.status(200).json(last5UniqueAddresses);
});

app.get('/address/to/last-3-to', authorizationMiddleware, (req, res) => {
    const user = req.user;
    const userOrders = ORDERS.filter(order => order.login === user.login);
    const uniqueAddresses = [...new Set(userOrders.map(order => order.to))];

    const last3UniqueAddresses = uniqueAddresses.slice(-3);

    res.status(200).json(last3UniqueAddresses);
});

app.get('/orders/lowest', (req, res) => {
    const { headers } = req;
    const token = headers.authorization;

    if (!token) {
        return res.status(401).send();
    }

    const user = USERS.find(el => el.token === token);
    if (!user) {
        return res.status(400).send({
            message: `User was not found by token: ${token}`
        });
    }

    const userOrders = ORDERS.filter(order => order.login === user.login);
    if (userOrders.length === 0) {
        return res.status(404).send({
            message: "User does not have any orders yet"
        });
    }

    const lowestOrder = userOrders.reduce((minOrder, currentOrder) => {
        return minOrder.price < currentOrder.price ? minOrder : currentOrder;
    });

    res.status(200).json(lowestOrder);
});


app.get('/orders/biggest', (req, res) => {
    const { headers } = req;
    const token = headers.authorization;

    if (!token) {
        return res.status(401).send();
    }

    const user = USERS.find(el => el.token === token);
    if (!user) {
        return res.status(400).send({
            message: `User was not found by token: ${token}`
        });
    }

    const userOrders = ORDERS.filter(order => order.login === user.login);
    if (userOrders.length === 0) {
        return res.status(404).send({
            message: "User does not have any orders yet"
        });
    }

    const biggestOrder = userOrders.reduce((maxOrder, currentOrder) => {
        return maxOrder.price > currentOrder.price ? maxOrder : currentOrder;
    });

    res.status(200).json(biggestOrder);
});