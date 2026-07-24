import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
} from "firebase/firestore";

import { db } from "../lib/firebase";
import { MenuItem } from "../types/menu";

const menuCollection = collection(db, "menus");

export async function getMenus(): Promise<MenuItem[]> {
  const snapshot = await getDocs(menuCollection);

  return snapshot.docs.map((docItem) => ({
    id: docItem.id as any,
    ...docItem.data(),
  })) as MenuItem[];
}

export async function addMenu(
  menu: Omit<MenuItem, "id">
) {
  await addDoc(menuCollection, menu);
}

export async function updateMenu(
  id: string,
  data: Partial<MenuItem>
) {
  await updateDoc(doc(db, "menus", id), data);
}

export async function deleteMenu(id: string) {
  await deleteDoc(doc(db, "menus", id));
}