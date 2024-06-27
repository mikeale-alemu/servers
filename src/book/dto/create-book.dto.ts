import { Catagory } from "../schemas/book.schemas";


export class CreateBookDto {
  readonly title: string;
  readonly description: string;
  readonly author: string;
  readonly price: number;
  readonly catagory: Catagory;
}