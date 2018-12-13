import {Field, InputType} from "type-graphql";
import {Column} from "typeorm";

@InputType()
export class FeedPostInput {

    @Field(type => String)
    title: string;

    @Field(type => String)
    body: string;

    @Field(type => Boolean)
    isPinned: boolean;
}