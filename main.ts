import { MongoClient, ObjectId } from "mongodb";
import { Author, AuthorModel, Book, BookModel } from "./types.ts";
import { getAuthorFromModel, getBookFromModel } from "./utils.ts";

const MONGO_URL = Deno.env.get("MONGO_URL");
if (!MONGO_URL) {
	console.error("MONGO_URL not defined");
	Deno.exit(1);
}

const client = new MongoClient(MONGO_URL);
await client.connect();
console.log("Connected to MongoDB (￣︶￣*))");

const db = client.db("biblioteca");
const authorsCollection = db.collection<AuthorModel>("autores");
const booksCollection = db.collection<BookModel>("libros");

const handler = async (req: Request): Promise<Response> => {
	const method = req.method;
	const url = new URL(req.url);
	const path = url.pathname;

	if (method === "GET") {
		if (path === "/libros") {
			const title = url.searchParams.get("titulo");
			const id = url.searchParams.get("id");
			let bookModels: BookModel[] = await booksCollection.find().toArray();
			if (title) {
				bookModels = await booksCollection.find({ title }).toArray();
				if (bookModels.length === 0) {
					return new Response(
						`No se encontraron libros con ese título.:${title}`,
						{
							status: 404,
						}
					);
				}
			}
			const books: Book[] = await Promise.all(
				bookModels.map((b: BookModel) => getBookFromModel(b, authorsCollection))
			);

			return new Response(JSON.stringify({ books }));
		} else if (path === "/libro") {
			const id = url.searchParams.get("id");
			if (!id) {
				return new Response("Bad request, id missing", { status: 400 });
			}
			const bookModel: BookModel | null = await booksCollection.findOne({
				_id: new ObjectId(id),
			});
			if (!bookModel) {
				return new Response(`error": "Libro no encontrado.id:${id}`, {
					status: 404,
				});
			}
		}
		return new Response(
			`Bad request, no path : ${path} found for method : ${method}`,
			{ status: 400 }
		);
	} else if (method === "POST") {
		if (path === "/libro") {
			const book: Book = await req.json();
			// Check : Si faltan datos requeridos
			if (!book.title || !book.authors) {
				return new Response(
					"error: El título y los autores son campos requeridos.",
					{ status: 400 }
				);
			}
			// Check : Si alguno de los autores no existe.
			const authorIds: ObjectId[] = book.authors.map(
				(authorID) => new ObjectId(authorID.toString())
			);
			const bookAuthorsModels: AuthorModel[] = await authorsCollection
				.find({ _id: { $in: authorIds } })
				.toArray();
			if (bookAuthorsModels.length !== book.authors.length) {
				return new Response("error : Algún Autor no existe", { status: 400 });
			}
			// TODO OK --> POST
			const bookAuthors: Author[] = await Promise.all(
				bookAuthorsModels.map((a: AuthorModel) => getAuthorFromModel(a))
			);
			const { insertedId } = await booksCollection.insertOne({
				title: book.title,
				authors: authorIds,
				copies: book.copies,
			});

			return new Response(
				JSON.stringify({
					message: "Libro creado exitosamente",
					libro: {
						id: insertedId,
						title: book.title,
						authors: bookAuthors,
						copies: book.copies,
					},
				}),
				{ status: 201 }
			);
		} else if (path === "/autor") {
			const author: Author = await req.json();
			// Check : Si faltan datos requeridos
			if (!author.name || !author.biography) {
				return new Response(
					"error: El nombre del autor y la biografía son campos requeridos.",
					{ status: 400 }
				);
			}
			const { insertedId } = await authorsCollection.insertOne({
				name: author.name,
				biography: author.biography,
			});
			return new Response(
				JSON.stringify({
					message: "Autor creado exitosamente",
					libro: {
						id: insertedId,
						name: author.name,
						biography: author.biography,
					},
				}),
				{ status: 201 }
			);
		}
		return new Response(
			`Bad request, no path : ${path} found for method : ${method}`,
			{ status: 400 }
		);
	} else if (method === "PUT") {
		if (path === "/libro") {
			const book: Book = await req.json();
			// Check : Si faltan datos requeridos
			if (!book.title || !book.authors) {
				return new Response("error : Faltan campos", { status: 400 });
			}
			// Check : Si alguno de los autores no existe.
			const authorIds: ObjectId[] = book.authors.map(
				(author) => new ObjectId(author.toString())
			);
			const bookAuthorsModels: AuthorModel[] = await authorsCollection
				.find({ _id: { $in: authorIds } })
				.toArray();
			if (bookAuthorsModels.length !== book.authors.length) {
				return new Response("error : Algún Autor no existe", { status: 400 });
			}
			// TODO OK --> UPDATE
			const { modifiedCount } = await booksCollection.updateOne(
				{ _id: new ObjectId(book.id) },
				{ $set: { title: book.title, authors: authorIds } }
			);
			if (modifiedCount === 0) {
				return new Response("error : El ID del libro no existe.", {
					status: 404,
				});
			}
			return new Response(
				JSON.stringify({
					message: "Libro actualizado exitosamente",
					libro: {
						id: book.id,
						title: book.title,
						authors: bookAuthorsModels,
						copies: book.copies,
					},
				})
			);
		}
		return new Response(
			`Bad request, no path : ${path} found for method : ${method}`,
			{ status: 400 }
		);
	} else if (method === "DELETE") {
		if (path === "/libro") {
			const id = url.searchParams.get("id");
			if (!id) {
				return new Response("Bad request, missing id field", { status: 400 });
			}
			const { deletedCount } = await booksCollection.deleteOne({
				_id: new ObjectId(id),
			});
			if (deletedCount === 0) {
				return new Response("error : Libro no encontrado.", { status: 404 });
			}
			return new Response("message : Libro eliminado exitosamente.", {
				status: 200,
			});
		}
		return new Response(
			`Bad request, no path : ${path} found for method : ${method}`,
			{ status: 400 }
		);
	}
	return new Response("Bad request, no endpoint found", { status: 400 });
};

Deno.serve({ port: 4000 }, handler);
