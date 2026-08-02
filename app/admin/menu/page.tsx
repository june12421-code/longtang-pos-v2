"use client";

import { FormEvent, useEffect, useState } from "react";

import {
  addMenu,
  deleteMenu,
  getMenus,
  updateMenu,
} from "../../../services/menuService";

import { uploadMenuImage } from "../../../services/storageService";
import { MenuItem } from "../../../types/menu";

export default function AdminMenuPage() {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
 const [allowedOrderTypes, setAllowedOrderTypes] = useState({
  shabu: true,
  dry: true,
  fried: true,
}); 
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
const [selectedMenuIds, setSelectedMenuIds] =
  useState<Set<string>>(new Set());
  async function loadMenus() {
    try {
      setLoading(true);

      const menuData = await getMenus();

      const sortedMenus = [...menuData].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
      );

      setMenus(sortedMenus);
    } catch (error) {
      console.error("โหลดเมนูไม่สำเร็จ:", error);
      setMessage("โหลดข้อมูลเมนูไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMenus();
  }, []);

function resetForm() {
  setName("");
  setPrice("");
  setCategory("");

  setAllowedOrderTypes({
    shabu: true,
    dry: true,
    fried: true,
  });

  setImageFile(null);
  setEditingId(null);
  setShowForm(false);
}

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    const numericPrice = Number(price);

    if (!trimmedName) {
      setMessage("กรุณากรอกชื่อเมนู");
      return;
    }

    if (!price || numericPrice < 0) {
      setMessage("กรุณากรอกราคาให้ถูกต้อง");
      return;
    }
const hasAllowedOrderType =
  allowedOrderTypes.shabu ||
  allowedOrderTypes.dry ||
  allowedOrderTypes.fried;

if (!hasAllowedOrderType) {
  setMessage("กรุณาเลือกประเภทอาหารอย่างน้อย 1 ประเภท");
  return;
}
    try {
      setSaving(true);
      setMessage("");

      let imageUrl = "";

if (imageFile) {
  imageUrl = await uploadMenuImage(imageFile);
}
      if (editingId) {
  const updateData: Partial<MenuItem> = {
  name: trimmedName,
  price: numericPrice,
  category: category.trim() || "ทั่วไป",
  allowedOrderTypes,
};

  if (imageUrl) {
    updateData.imageUrl = imageUrl;
  }

  await updateMenu(editingId, updateData);

const latestMenus = await getMenus();
setMenus(latestMenus);

setMessage("แก้ไขเมนูเรียบร้อยแล้ว");
} else {
        await addMenu({
  name: trimmedName,
  price: numericPrice,
  category: category.trim() || "ทั่วไป",
  imageUrl,
  available: true,
  sortOrder: menus.length + 1,
  allowedOrderTypes,
});
const latestMenus = await getMenus();
setMenus(latestMenus);
        setMessage("เพิ่มเมนูเรียบร้อยแล้ว");
      }

      resetForm();
      await loadMenus();
    } catch (error) {
      console.error("บันทึกเมนูไม่สำเร็จ:", error);
      setMessage("บันทึกเมนูไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(menu: MenuItem) {
    setEditingId(String(menu.id));
    setName(menu.name);
    setPrice(String(menu.price));
    setCategory(menu.category ?? "");
    setAllowedOrderTypes(
  menu.allowedOrderTypes ?? {
    shabu: true,
    dry: true,
    fried: true,
  }
);
    setMessage("");
setShowForm(true);

window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }
function handleToggleMenuSelection(menuId: string) {
  setSelectedMenuIds((currentIds) => {
    const nextIds = new Set(currentIds);

    if (nextIds.has(menuId)) {
      nextIds.delete(menuId);
    } else {
      nextIds.add(menuId);
    }

    return nextIds;
  });
}

function handleSelectAllMenus() {
  setSelectedMenuIds(
    new Set(menus.map((menu) => String(menu.id)))
  );
}

function handleClearMenuSelection() {
  setSelectedMenuIds(new Set());
}
async function handleBulkToggleAvailable(available: boolean) {
  if (selectedMenuIds.size === 0) {
    setMessage("กรุณาเลือกเมนูก่อน");
    return;
  }

  try {
    setSaving(true);

    await Promise.all(
      menus
        .filter((menu) => selectedMenuIds.has(String(menu.id)))
        .map((menu) =>
          updateMenu(String(menu.id), {
            available,
          })
        )
    );

    setSelectedMenuIds(new Set());

    setMessage(
      available
        ? "เปิดขายหลายเมนูเรียบร้อยแล้ว"
        : "ปิดขายหลายเมนูเรียบร้อยแล้ว"
    );

    await loadMenus();
  } catch (error) {
    console.error(error);
    setMessage("เกิดข้อผิดพลาด");
  } finally {
    setSaving(false);
  }
}
  async function handleToggleAvailable(menu: MenuItem) {
    try {
      const currentAvailable = menu.available !== false;

      await updateMenu(String(menu.id), {
        available: !currentAvailable,
      });

      await loadMenus();
    } catch (error) {
      console.error("เปลี่ยนสถานะเมนูไม่สำเร็จ:", error);
      setMessage("เปลี่ยนสถานะเมนูไม่สำเร็จ");
    }
  }

  async function handleDelete(menu: MenuItem) {
    const confirmed = window.confirm(
      `ต้องการลบเมนู "${menu.name}" ใช่หรือไม่`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteMenu(String(menu.id));

      if (editingId === String(menu.id)) {
        resetForm();
      }

      setMessage("ลบเมนูเรียบร้อยแล้ว");
      await loadMenus();
    } catch (error) {
      console.error("ลบเมนูไม่สำเร็จ:", error);
      setMessage("ลบเมนูไม่สำเร็จ");
    }
  }

  return (
    <main
  style={{
    minHeight: "100vh",
    backgroundColor: "#f5f5f5",
    padding: "16px",
    color: "#111",
  }}
>
      <div
        style={{
          width: "100%",
          maxWidth: "700px",
          margin: "0 auto",
        }}
      >
        <h1
  style={{
    fontSize: "28px",
    fontWeight: "bold",
    marginBottom: "8px",
    color: "#111",
  }}
>
          จัดการเมนู
        </h1>

        <p
  style={{
    color: "#666",
    marginBottom: "14px",
  }}
>
  เพิ่ม แก้ไข เปิด–ปิดขาย หรือลบเมนู
</p>

<button
  type="button"
  onClick={() => {
    if (showForm) {
      resetForm();
      return;
    }

    setEditingId(null);
    setShowForm(true);
  }}
  style={{
    position: "sticky",
    top: "10px",
    zIndex: 20,
    width: "100%",
    marginBottom: "16px",
    padding: "14px",
    border: "none",
    borderRadius: "12px",
    backgroundColor: showForm ? "#374151" : "#ff6600",
    color: "#ffffff",
    fontSize: "17px",
    fontWeight: "bold",
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(0, 0, 0, 0.18)",
  }}
>
  {showForm
    ? "✕ ปิดฟอร์ม"
    : "＋ เพิ่มเมนูใหม่"}
</button>
{showForm && (
        <form
          onSubmit={handleSubmit}
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            padding: "16px",
            marginBottom: "20px",
            boxShadow: "0 2px 10px rgba(0, 0, 0, 0.08)",
          }}
        >
          <h2
  style={{
    fontSize: "20px",
    fontWeight: "bold",
    marginBottom: "16px",
    color: "#111",
  }}
>
            {editingId ? "แก้ไขเมนู" : "เพิ่มเมนูใหม่"}
          </h2>

          <label
            style={{
              display: "block",
              marginBottom: "6px",
              fontWeight: "bold",
            }}
          >
            ชื่อเมนู
          </label>

          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="เช่น หมูสามชั้น"
            style={{
  width: "100%",
  padding: "12px",
  border: "1px solid #cccccc",
  borderRadius: "10px",
  marginBottom: "14px",
  fontSize: "16px",
  background: "#fff",
  color: "#222",
}}
          />

          <label
            style={{
              display: "block",
              marginBottom: "6px",
              fontWeight: "bold",
            }}
          >
            ราคา
          </label>

          <input
            type="number"
            min="0"
            step="1"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            placeholder="เช่น 10"
            style={{
  width: "100%",
  padding: "12px",
  border: "1px solid #cccccc",
  borderRadius: "10px",
  marginBottom: "14px",
  fontSize: "16px",
  background: "#fff",
  color: "#222",
}}
          />

          <label
            style={{
              display: "block",
              marginBottom: "6px",
              fontWeight: "bold",
            }}
          >
            หมวดหมู่
          </label>

          <input
            type="text"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            placeholder="เช่น ลูกชิ้น เนื้อสัตว์ ผัก"
            style={{
  width: "100%",
  padding: "12px",
  border: "1px solid #cccccc",
  borderRadius: "10px",
  marginBottom: "14px",
  fontSize: "16px",
  background: "#fff",
  color: "#222",
}}
          />
          <div
  style={{
    marginBottom: "18px",
  }}
>
  <p
    style={{
      marginTop: 0,
      marginBottom: "10px",
      fontWeight: "bold",
      color: "#111",
    }}
  >
    ขายได้ในประเภทอาหาร
  </p>

  <div
    style={{
      display: "grid",
      gap: "10px",
    }}
  >
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "12px",
        border: "1px solid #dddddd",
        borderRadius: "10px",
        cursor: "pointer",
      }}
    >
      <input
        type="checkbox"
        checked={allowedOrderTypes.shabu}
        onChange={(event) =>
          setAllowedOrderTypes((current) => ({
            ...current,
            shabu: event.target.checked,
          }))
        }
        style={{
          width: "20px",
          height: "20px",
        }}
      />

      <span>🍲 ชาบู</span>
    </label>

    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "12px",
        border: "1px solid #dddddd",
        borderRadius: "10px",
        cursor: "pointer",
      }}
    >
      <input
        type="checkbox"
        checked={allowedOrderTypes.dry}
        onChange={(event) =>
          setAllowedOrderTypes((current) => ({
            ...current,
            dry: event.target.checked,
          }))
        }
        style={{
          width: "20px",
          height: "20px",
        }}
      />

      <span>🌶️ หม่าล่าผัดแห้ง</span>
    </label>

    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "12px",
        border: "1px solid #dddddd",
        borderRadius: "10px",
        cursor: "pointer",
      }}
    >
      <input
        type="checkbox"
        checked={allowedOrderTypes.fried}
        onChange={(event) =>
          setAllowedOrderTypes((current) => ({
            ...current,
            fried: event.target.checked,
          }))
        }
        style={{
          width: "20px",
          height: "20px",
        }}
      />

      <span>🔥 หม่าล่าทอด</span>
    </label>
  </div>
</div>
<label
  style={{
    display: "block",
    marginTop: "12px",
    marginBottom: "6px",
    fontWeight: "bold",
    color: "#111",
  }}
>
  รูปสินค้า
</label>

<input
  type="file"
  accept="image/*"
  onChange={(event) => {
    const file = event.target.files?.[0] ?? null;
    setImageFile(file);
  }}
  style={{
    width: "100%",
    marginBottom: "8px",
    color: "#111",
  }}
/>

{imageFile && (
  <p
    style={{
      marginTop: 0,
      marginBottom: "16px",
      fontSize: "14px",
      color:
        imageFile.size > 5 * 1024 * 1024
          ? "#b91c1c"
          : "#166534",
    }}
  >
    ไฟล์: {imageFile.name}
    <br />
    ขนาด: {(imageFile.size / 1024 / 1024).toFixed(2)} MB
    {imageFile.size > 5 * 1024 * 1024
      ? " — รูปใหญ่เกิน 5 MB"
      : " — ใช้งานได้"}
  </p>
)}
          <div
            style={{
              display: "flex",
              gap: "10px",
            }}
          >
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 1,
                padding: "13px",
                border: "none",
                borderRadius: "10px",
                backgroundColor: "#111111",
                color: "#ffffff",
                fontSize: "16px",
                fontWeight: "bold",
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving
                ? "กำลังบันทึก..."
                : editingId
                  ? "บันทึกการแก้ไข"
                  : "เพิ่มเมนู"}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                style={{
                  padding: "13px 18px",
                  border: "1px solid #cccccc",
                  borderRadius: "10px",
                  backgroundColor: "#ffffff",
                  fontSize: "16px",
                  cursor: "pointer",
                }}
              >
                ยกเลิก
              </button>
            )}
          </div>
        </form>
)}

{message && (
          <div
            style={{
              backgroundColor: "#fff7d6",
              borderRadius: "10px",
              padding: "12px",
              marginBottom: "16px",
            }}
          >
            {message}
          </div>
        )}

        <h2
  style={{
    fontSize: "22px",
    fontWeight: "bold",
    marginBottom: "14px",
    color: "#111",
  }}
>
  รายการเมนูทั้งหมด ({menus.length})
</h2>

<div
  style={{
    backgroundColor: "#ffffff",
    borderRadius: "14px",
    padding: "14px",
    marginBottom: "16px",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
  }}
>
  <div
    style={{
      display: "flex",
      gap: "8px",
      flexWrap: "wrap",
      alignItems: "center",
    }}
  >
    <button
      type="button"
      onClick={handleSelectAllMenus}
      disabled={menus.length === 0}
      style={{
        padding: "10px 14px",
        border: "none",
        borderRadius: "9px",
        backgroundColor: "#2563eb",
        color: "#ffffff",
        fontWeight: "bold",
        cursor:
          menus.length === 0
            ? "not-allowed"
            : "pointer",
        opacity: menus.length === 0 ? 0.5 : 1,
      }}
    >
      ☑️ เลือกทั้งหมด
    </button>

    <button
      type="button"
      onClick={handleClearMenuSelection}
      disabled={selectedMenuIds.size === 0}
      style={{
        padding: "10px 14px",
        border: "none",
        borderRadius: "9px",
        backgroundColor: "#e5e7eb",
        color: "#111111",
        fontWeight: "bold",
        cursor:
          selectedMenuIds.size === 0
            ? "not-allowed"
            : "pointer",
        opacity:
          selectedMenuIds.size === 0 ? 0.5 : 1,
      }}
    >
      ⬜ ยกเลิกการเลือก
    </button>

   <button
  type="button"
  disabled={selectedMenuIds.size === 0 || saving}
  onClick={() => handleBulkToggleAvailable(false)}
  style={{
    padding: "10px 14px",
    border: "none",
    borderRadius: "9px",
    backgroundColor: "#ef4444",
    color: "#ffffff",
    fontWeight: "bold",
    cursor:
      selectedMenuIds.size === 0 || saving
        ? "not-allowed"
        : "pointer",
    opacity:
      selectedMenuIds.size === 0 || saving
        ? 0.5
        : 1,
  }}
>
  🚫 ปิดขายที่เลือก
</button>

<button
  type="button"
  disabled={selectedMenuIds.size === 0 || saving}
  onClick={() => handleBulkToggleAvailable(true)}
  style={{
    padding: "10px 14px",
    border: "none",
    borderRadius: "9px",
    backgroundColor: "#22c55e",
    color: "#ffffff",
    fontWeight: "bold",
    cursor:
      selectedMenuIds.size === 0 || saving
        ? "not-allowed"
        : "pointer",
    opacity:
      selectedMenuIds.size === 0 || saving
        ? 0.5
        : 1,
  }}
>
  ✅ เปิดขายที่เลือกห
</button>

<span
  style={{
    marginLeft: "auto",
    fontWeight: "bold",
    color:
      selectedMenuIds.size > 0
        ? "#ff6600"
        : "#666666",
  }}
>
  เลือกแล้ว {selectedMenuIds.size} เมนู
</span> 
  </div>
</div>

        {loading ? (
          <p>กำลังโหลดเมนู...</p>
        ) : menus.length === 0 ? (
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "14px",
              padding: "24px",
              textAlign: "center",
            }}
          >
            ยังไม่มีเมนูใน Firestore
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "12px",
            }}
          >
            {menus.map((menu) => {
              const isAvailable = menu.available !== false;

              return (
 <article
  key={String(menu.id)}
  style={{
    backgroundColor: selectedMenuIds.has(
      String(menu.id)
    )
      ? "#fff7ed"
      : "#ffffff",
    borderRadius: "14px",
    padding: "16px",
    boxShadow: selectedMenuIds.has(
      String(menu.id)
    )
      ? "0 0 0 3px #ff6600"
      : "0 2px 8px rgba(0, 0, 0, 0.06)",
    opacity: isAvailable ? 1 : 0.6,
  }}
>
  <label
    style={{
      display: "flex",
      alignItems: "center",
      gap: "10px",
      marginBottom: "14px",
      padding: "10px",
      borderRadius: "10px",
      backgroundColor: selectedMenuIds.has(
        String(menu.id)
      )
        ? "#ffedd5"
        : "#f3f4f6",
      color: "#111111",
      fontWeight: "bold",
      cursor: "pointer",
    }}
  >
    <input
      type="checkbox"
      checked={selectedMenuIds.has(
        String(menu.id)
      )}
      onChange={() =>
        handleToggleMenuSelection(
          String(menu.id)
        )
      }
      style={{
        width: "22px",
        height: "22px",
        cursor: "pointer",
      }}
    />

    <span>
      เลือกเมนูนี้
    </span>
  </label>               
                  <div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    marginBottom: "12px",
    flexWrap: "wrap",
  }}
>
  <div
  style={{
    display: "flex",
    gap: "12px",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  }}
>                  
  {menu.imageUrl ? (
    <img
      src={menu.imageUrl}
      alt={menu.name}
      style={{
        width: "72px",
height: "72px",
        objectFit: "cover",
        borderRadius: "12px",
        flexShrink: 0,
      }}
    />
  ) : (
    <div
      style={{
        width: "80px",
        height: "80px",
        borderRadius: "12px",
        backgroundColor: "#eeeeee",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "13px",
        color: "#777777",
        flexShrink: 0,
      }}
    >
      ไม่มีรูป
    </div>
  )}

  <div>
                      <h3
  style={{
    fontSize: "19px",
    fontWeight: "bold",
    marginBottom: "4px",
    wordBreak: "break-word",
  }}
>
                        {menu.name}
                      </h3>

                      <p
                        style={{
                          color: "#666666",
                          marginBottom: "4px",
                        }}
                      >
                        หมวด: {menu.category || "ทั่วไป"}
                      </p>

                      <p
  style={{
    fontSize: "18px",
    fontWeight: "bold",
    wordBreak: "break-word",
  }}
>
                        {menu.price} บาท
                      </p>
                      <div
  style={{
    marginTop: "8px",
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
  }}
>
  {(
    menu.allowedOrderTypes ?? {
      shabu: true,
      dry: true,
      fried: true,
    }
  ).shabu && (
    <span
      style={{
        background: "#dbeafe",
        color: "#1d4ed8",
        padding: "4px 8px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: "bold",
      }}
    >
      🍲 ชาบู
    </span>
  )}

  {(
    menu.allowedOrderTypes ?? {
      shabu: true,
      dry: true,
      fried: true,
    }
  ).dry && (
    <span
      style={{
        background: "#fef3c7",
        color: "#92400e",
        padding: "4px 8px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: "bold",
      }}
    >
      🌶️ ผัดแห้ง
    </span>
  )}

  {(
    menu.allowedOrderTypes ?? {
      shabu: true,
      dry: true,
      fried: true,
    }
  ).fried && (
    <span
      style={{
        background: "#fee2e2",
        color: "#b91c1c",
        padding: "4px 8px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: "bold",
      }}
    >
      🔥 ทอด
    </span>
  )}
</div>
                    </div>
</div>
                    <span
                      style={{
                        height: "fit-content",
                        padding: "6px 10px",
                        borderRadius: "999px",
                        backgroundColor: isAvailable ? "#dcfce7" : "#eeeeee",
                        color: isAvailable ? "#166534" : "#555555",
                        fontSize: "14px",
                        fontWeight: "bold",
                      }}
                    >
                      {isAvailable ? "เปิดขาย" : "ปิดขาย"}
                    </span>
                  </div>

                  <div
  style={{
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(110px,1fr))",
    gap: "8px",
  }}
>
                    <button
                      type="button"
                      onClick={() => handleEdit(menu)}
                      style={{
                        padding: "10px",
                        border: "none",
                        borderRadius: "9px",
                        backgroundColor: "#facc15",
                        fontWeight: "bold",
                        cursor: "pointer",
                      }}
                    >
                      แก้ไข
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleAvailable(menu)}
                      style={{
                        padding: "10px",
                        border: "none",
                        borderRadius: "9px",
                        backgroundColor: isAvailable ? "#e5e7eb" : "#bbf7d0",
                        fontWeight: "bold",
                        cursor: "pointer",
                      }}
                    >
                      {isAvailable ? "ปิดขาย" : "เปิดขาย"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(menu)}
                      style={{
                        padding: "10px",
                        border: "none",
                        borderRadius: "9px",
                        backgroundColor: "#fecaca",
                        color: "#991b1b",
                        fontWeight: "bold",
                        cursor: "pointer",
                      }}
                    >
                      ลบ
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}