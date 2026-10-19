import type { KnowledgeCard } from "../types";
import { k06 } from "./k06";
import { k07 } from "./k07";
import { k08 } from "./k08";
import { k09 } from "./k09";
import { k10 } from "./k10";
import { k11 } from "./k11";

export const knowledge: KnowledgeCard[] = [...k06, ...k07, ...k08, ...k09, ...k10, ...k11];
export const knowledgeById = new Map(knowledge.map((k) => [k.id, k]));
