import { Collection } from "mongodb";
import { Author, AuthorModel, Book, BookModel } from "./types.ts";

export const getBookFromModel = async (
	bookModel: BookModel,
	authorsCollection: Collection<AuthorModel>
): Promise<Book> => {
	const authorModels: AuthorModel[] = await authorsCollection
		.find({ _id: { $in: bookModel.authors } })
		.toArray();
	const authors: Author[] = authorModels.map((a: AuthorModel) =>
		getAuthorFromModel(a)
	);
	return {
		id: bookModel._id!.toString(),
		title: bookModel.title,
		authors: authors,
		copies: bookModel.copies,
	};
};

export const getAuthorFromModel = (authorModel: AuthorModel): Author => {
	return {
		id: authorModel._id!.toString(),
		name: authorModel.name,
		biography: authorModel.biography,
	};
};
