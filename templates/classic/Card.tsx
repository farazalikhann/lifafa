import CardCanvas from "@/components/card/CardCanvas";

/**
 * Classic's card is CardCanvas itself, not a wrapper round it: the same
 * component with the same props, so a card saved before there were templates
 * is drawn by exactly the code that has always drawn it.
 */
export default CardCanvas;
