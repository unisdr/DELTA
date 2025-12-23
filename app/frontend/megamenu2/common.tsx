import { ViewContext } from "../context";
import {IconId} from "../icons/undp-icon-set/icons";

export interface Lvl1Item {
	name: string;
	title?: string;
	icon?: IconId;
	link?: string;
	lvl2?: Lvl2Item[];
}

export interface Lvl2Item {
	name: string;
	id: string;
	lvl3: Lvl3Item[];
}

export interface Lvl3Item {
	title: string;
	lvl4: Lvl4Item[];
}

export interface Lvl4Item {
	name: string;
	link: string;
}

export interface MegaMenuProps {
	ctx: ViewContext;
	items: Lvl1Item[];
}

export function mapNavLinks(
  items: Lvl1Item[],
  transform: (link: string) => string
): Lvl1Item[] {
  return items.map(item => {
    const mappedItem = { ...item };
    if (mappedItem.link) {
      mappedItem.link = transform(mappedItem.link);
    }
    if (mappedItem.lvl2) {
      mappedItem.lvl2 = mappedItem.lvl2.map(lvl2 => ({
        ...lvl2,
        lvl3: lvl2.lvl3.map(lvl3 => ({
          ...lvl3,
          lvl4: lvl3.lvl4.map(lvl4 => ({
            ...lvl4,
            link: transform(lvl4.link)
          }))
        }))
      }));
    }
    return mappedItem;
  });
}
