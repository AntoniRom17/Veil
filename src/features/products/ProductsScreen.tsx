import { Archive, Beaker, Copy, Edit3, Heart, MoreHorizontal, Pause, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Button } from "@/src/components/common/Button";
import { ConfirmDialog } from "@/src/components/common/ConfirmDialog";
import { EmptyState } from "@/src/components/common/EmptyState";
import { IconButton } from "@/src/components/common/IconButton";
import { Sheet } from "@/src/components/common/Sheet";
import { TextField } from "@/src/components/forms/Field";
import { ScreenHeader } from "@/src/components/navigation/ScreenHeader";
import { getDatabase } from "@/src/db/VeilDatabase";
import { useObjectUrl } from "@/src/hooks/useObjectUrl";
import { PRODUCT_STATUS_LABELS } from "@/src/lib/constants";
import { MediaRepository } from "@/src/repositories/mediaRepository";
import { ProductRepository } from "@/src/repositories/productRepository";
import { processImage } from "@/src/services/imageService";
import type { Category, MediaAsset, Product } from "@/src/types/domain";
import { formatShortDate, getPaoDate, getPaoState } from "@/src/utils/dates";
import { toUserMessage } from "@/src/utils/errors";
import { createId } from "@/src/utils/id";
import { ProductForm, type ProductFormValue } from "./ProductForm";

function ProductPhoto({ media, alt, large = false }: { media?: MediaAsset; alt: string; large?: boolean }) {
  const url = useObjectUrl(media ? (large ? media.blob : media.thumbnail) : undefined);
  return <div className={`product-photo${large ? " product-photo--large" : ""}`}>{url ? <img src={url} alt={alt} /> : <Beaker size={large ? 38 : 23} aria-hidden="true" />}</div>;
}

function ProductCard({ product, onOpen, onActions }: { product: Product; onOpen(): void; onActions(): void }) {
  const db = getDatabase();
  const [today] = useState(() => new Date());
  const media = useLiveQuery(() => product.photoId ? db.media.get(product.photoId) : undefined, [db, product.photoId]);
  const paoState = getPaoState(product.dateOpened, product.paoMonths, today);
  return (
    <article className="product-card">
      <button type="button" className="product-card__main" onClick={onOpen}>
        <ProductPhoto media={media} alt={`${product.name} product`} />
        <span className="product-card__copy"><span className="product-card__eyebrow">{product.brand || product.categoryName}</span><span className="product-card__title">{product.name}{product.favorite ? <Heart size={13} fill="currentColor" aria-label="Favorite" /> : null}</span><span className="product-card__meta"><span>{PRODUCT_STATUS_LABELS[product.status]}</span>{paoState !== "unknown" ? <span data-tone={paoState}>{paoState === "fresh" ? "Fresh" : paoState === "expiring-soon" ? "PAO soon" : "Past PAO"}</span> : null}</span></span>
      </button>
      <IconButton label={`More actions for ${product.name}`} onClick={onActions}><MoreHorizontal size={20} /></IconButton>
    </article>
  );
}

function ProductDetail({ product, onClose, onEdit, onActions }: { product: Product; onClose(): void; onEdit(): void; onActions(): void }) {
  const db = getDatabase();
  const [today] = useState(() => new Date());
  const media = useLiveQuery(() => product.photoId ? db.media.get(product.photoId) : undefined, [db, product.photoId]);
  const routineStepCount = useLiveQuery(() => db.routineSteps.where("productId").equals(product.id).count(), [db, product.id], 0);
  const recentUsage = useLiveQuery(() => db.sessionSteps.where("productId").equals(product.id).filter((step) => step.state === "complete").toArray(), [db, product.id], []);
  const paoDate = getPaoDate(product.dateOpened, product.paoMonths);
  const paoState = getPaoState(product.dateOpened, product.paoMonths, today);
  const ageDays = product.dateOpened ? Math.max(0, Math.floor((today.getTime() - new Date(`${product.dateOpened}T00:00:00`).getTime()) / 86_400_000)) : undefined;
  return (
    <Sheet open title="Product details" size="large" onClose={onClose} footer={<div className="button-row"><Button variant="secondary" fullWidth leadingIcon={<MoreHorizontal size={17} />} onClick={onActions}>More</Button><Button fullWidth leadingIcon={<Edit3 size={17} />} onClick={onEdit}>Edit</Button></div>}>
      <article className="product-detail">
        <ProductPhoto media={media} alt={`${product.name} product`} large />
        <div className="product-detail__heading"><div><p>{product.brand || product.categoryName}</p><h2>{product.name}</h2></div>{product.favorite ? <Heart size={21} fill="currentColor" aria-label="Favorite product" /> : null}</div>
        <div className="product-detail__chips"><span>{product.categoryName}</span><span>{PRODUCT_STATUS_LABELS[product.status]}</span>{product.amAllowed ? <span>AM</span> : null}{product.pmAllowed ? <span>PM</span> : null}</div>
        <dl className="detail-grid">
          <div><dt>Opened</dt><dd>{product.dateOpened ? formatShortDate(product.dateOpened) : "Not recorded"}</dd>{ageDays !== undefined ? <small>{ageDays} days ago</small> : null}</div>
          <div><dt>PAO</dt><dd>{product.paoMonths ? `${product.paoMonths} months` : "Not recorded"}</dd>{paoDate ? <small>{formatShortDate(paoDate)} · {paoState === "past-pao" ? "Past PAO" : paoState === "expiring-soon" ? "Expiring soon" : "Fresh"}</small> : null}</div>
          <div><dt>Printed expiration</dt><dd>{product.printedExpirationDate ? formatShortDate(product.printedExpirationDate) : "Not recorded"}</dd><small>Manufacturer date</small></div>
          <div><dt>Recent usage</dt><dd>{recentUsage.length} completed step{recentUsage.length === 1 ? "" : "s"}</dd><small>Across saved sessions</small></div>
          <div><dt>Used in</dt><dd>{routineStepCount} routine step{routineStepCount === 1 ? "" : "s"}</dd></div>
          <div><dt>Size</dt><dd>{product.size || "Not recorded"}</dd></div>
        </dl>
        {product.activeIngredients ? <section className="detail-section"><h3>Active ingredients</h3><p>{product.activeIngredients}</p></section> : null}
        {product.ingredients ? <section className="detail-section"><h3>Ingredients</h3><p>{product.ingredients}</p></section> : null}
        {product.notes ? <section className="detail-section"><h3>Notes</h3><p>{product.notes}</p></section> : null}
        <p className="neutral-notice">PAO dates are organizational reminders based on the opening date you entered. Veil does not assess product safety.</p>
      </article>
    </Sheet>
  );
}

export function ProductsScreen() {
  const db = getDatabase();
  const repository = useMemo(() => new ProductRepository(db), [db]);
  const mediaRepository = useMemo(() => new MediaRepository(db), [db]);
  const products = useLiveQuery(() => repository.list(), [repository], []);
  const categories = useLiveQuery(() => db.categories.orderBy("order").toArray(), [db], []);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [detail, setDetail] = useState<Product | null>(null);
  const [actions, setActions] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const editPhoto = useLiveQuery(() => editing && editing !== "new" && editing.photoId ? db.media.get(editing.photoId) : undefined, [db, editing]);
  const filtered = products.filter((product) => `${product.name} ${product.brand} ${product.categoryName} ${product.ingredients} ${product.activeIngredients}`.toLowerCase().includes(query.trim().toLowerCase()));

  async function saveProduct(value: ProductFormValue) {
    setBusy(true);
    let newMediaId: string | undefined;
    try {
      const { photoFile, removePhoto, ...draft } = value;
      const previousPhotoId = editing && editing !== "new" ? editing.photoId : undefined;
      if (photoFile) {
        const processed = await processImage(photoFile);
        const media = await mediaRepository.create("product", processed);
        newMediaId = media.id;
        draft.photoId = media.id;
      } else if (removePhoto) draft.photoId = undefined;

      let saved: Product;
      if (editing && editing !== "new") saved = await repository.update(editing.id, draft);
      else saved = await repository.create(draft);
      if (previousPhotoId && previousPhotoId !== saved.photoId) await mediaRepository.remove(previousPhotoId);
      setEditing(null);
      setDetail(saved);
      setMessage(editing === "new" ? "Product added to your shelf." : "Product saved.");
    } catch (error) {
      if (newMediaId) await mediaRepository.remove(newMediaId).catch(() => undefined);
      setMessage(toUserMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function perform(action: "favorite" | "duplicate" | "finish" | "pause") {
    if (!actions) return;
    setBusy(true);
    try {
      const updated = action === "favorite" ? await repository.toggleFavorite(actions.id) : action === "duplicate" ? await repository.duplicate(actions.id) : await repository.setStatus(actions.id, action === "finish" ? "finished" : "paused");
      setMessage(action === "duplicate" ? "Product duplicated." : "Product updated.");
      if (detail?.id === actions.id) setDetail(updated);
      setActions(null);
    } catch (error) {
      setMessage(toUserMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await repository.remove(deleting.id);
      setDetail(null);
      setDeleting(null);
      setMessage("Product removed. Routine and history snapshots remain readable.");
    } catch (error) {
      setMessage(toUserMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function addCategory() {
    const name = categoryName.trim();
    if (!name) return;
    const timestamp = new Date().toISOString();
    const category: Category = { id: createId(), name, builtIn: false, order: categories.length, createdAt: timestamp, updatedAt: timestamp };
    try {
      await db.categories.add(category);
      setCategoryName("");
      setCategoryOpen(false);
      setMessage("Custom category added.");
    } catch {
      setMessage("That category already exists.");
    }
  }

  return (
    <div className="screen">
      <ScreenHeader eyebrow="Personal shelf" title="Products" description="Everything you use, without the clutter." action={<IconButton label="Add product" tone="accent" onClick={() => setEditing("new")}><Plus size={21} /></IconButton>} />
      {message ? <div className="status-banner" role="status"><span>{message}</span><button type="button" onClick={() => setMessage("")}>Dismiss</button></div> : null}
      {products.length ? <div className="library-toolbar"><label className="search-field"><Search size={18} aria-hidden="true" /><span className="sr-only">Search products</span><input type="search" placeholder="Search your shelf" value={query} onChange={(event) => setQuery(event.target.value)} /></label><button type="button" onClick={() => setCategoryOpen(true)}>Categories</button></div> : null}
      {!products.length ? <EmptyState icon={<Beaker size={26} />} title="Your shelf is empty." description="Add a product to keep its details, opening date, and routines close at hand." action={<Button leadingIcon={<Plus size={18} />} onClick={() => setEditing("new")}>Add product</Button>} /> : filtered.length ? <div className="product-list">{filtered.map((product) => <ProductCard key={product.id} product={product} onOpen={() => setDetail(product)} onActions={() => setActions(product)} />)}</div> : <EmptyState compact icon={<Search size={24} />} title="No products found." description="Try a different name, brand, category, or ingredient." />}
      {editing ? <ProductForm key={editing === "new" ? "new" : editing.id} open product={editing === "new" ? undefined : editing} photo={editPhoto} categories={categories} busy={busy} onClose={() => setEditing(null)} onSave={saveProduct} /> : null}
      {detail ? <ProductDetail product={products.find((item) => item.id === detail.id) ?? detail} onClose={() => setDetail(null)} onEdit={() => { setEditing(detail); setDetail(null); }} onActions={() => setActions(detail)} /> : null}
      <Sheet open={Boolean(actions)} title={actions?.name ?? "Product actions"} onClose={() => setActions(null)}><div className="action-list"><button type="button" onClick={() => perform("favorite")}><Heart size={19} /><span>{actions?.favorite ? "Remove from favorites" : "Add to favorites"}</span></button><button type="button" onClick={() => perform("finish")}><Archive size={19} /><span>Mark finished</span></button><button type="button" onClick={() => perform("pause")}><Pause size={19} /><span>Pause product</span></button><button type="button" onClick={() => perform("duplicate")}><Copy size={19} /><span>Duplicate product</span></button><button type="button" className="action-list__danger" onClick={() => { setDeleting(actions); setActions(null); }}><Trash2 size={19} /><span>Delete product</span></button></div></Sheet>
      <Sheet open={categoryOpen} title="Custom category" description="Built-in categories stay available." onClose={() => setCategoryOpen(false)} footer={<Button fullWidth onClick={addCategory}>Add category</Button>}><TextField label="Category name" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Facial Oil" /></Sheet>
      <ConfirmDialog open={Boolean(deleting)} title="Delete this product?" description="The product and its local photo will be removed. Saved routine history keeps its text snapshot." confirmLabel="Delete product" onClose={() => setDeleting(null)} onConfirm={remove} busy={busy} />
    </div>
  );
}
