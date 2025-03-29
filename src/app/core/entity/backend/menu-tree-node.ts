export interface MenuTreeNode {
  id: number;
  name: string;
  sequence: number;
  icon: string;
  link: string;
  disabled: boolean;
  parent: MenuTreeNode | null;
  children: MenuTreeNode[];
}
