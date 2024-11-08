import { ObjectId, OptionalId } from "mongodb";

export type AuthorModel = OptionalId<{
	name: string;
	biography: string;
}>;

export type BookModel = OptionalId<{
	title: string;
	authors: ObjectId[];
	copies: number;
}>;

export type Author = {
	id: string;
	name: string;
	biography: string;
};

export type Book = {
	id: string;
	title: string;
	authors: Author[];
	copies: number;
};
