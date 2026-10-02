import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";

import { db } from "../lib/firebase";
import { MenuItem } from "../types/menu";

const menuCollection = collection(db, "menus");

export async function getMenus(): Promise<MenuItem[]> {
  const menuQuery = query(
    menuCollection,
    orderBy("sortOrder", "asc")
  );

  const snapshot = await getDocs(menuQuery);

  return snapshot.docs.map((menuDoc) => {
  const data = menuDoc.data();

  return {
    ...data,
    id: menuDoc.id,
  } as unknown as MenuItem;
});
}

export async function addMenu(
  menu: Omit<MenuItem, "id">
): Promise<string> {
  const docRef = await addDoc(menuCollection, menu);

  return docRef.id;
}

export async function updateMenu(
  id: string,
  data: Partial<MenuItem>
): Promise<void> {
  const menuRef = doc(db, "menus", id);

  const { id: _id, ...updateData } = data;

  await updateDoc(menuRef, updateData);
}

export async function deleteMenu(
  id: string
): Promise<void> {
  const menuRef = doc(db, "menus", id);

  await deleteDoc(menuRef);
}