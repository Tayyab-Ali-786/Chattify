import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'users.json');

export interface User {
    id: string;
    email: string;
    password: string;
    name: string;
    createdAt: string;
}

// Ensure data directory exists
const ensureDataDir = () => {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(DB_PATH)) {
        fs.writeFileSync(DB_PATH, JSON.stringify({ users: [] }, null, 2));
    }
};

export const getUsers = (): User[] => {
    ensureDataDir();
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data).users;
};

export const getUserByEmail = (email: string): User | undefined => {
    const users = getUsers();
    return users.find(u => u.email === email);
};

export const createUser = (user: Omit<User, 'id' | 'createdAt'>): User => {
    ensureDataDir();
    const users = getUsers();
    const newUser: User = {
        ...user,
        id: Date.now().toString(),
        createdAt: new Date().toISOString()
    };
    users.push(newUser);
    fs.writeFileSync(DB_PATH, JSON.stringify({ users }, null, 2));
    return newUser;
};
