"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/client";
import { Choice, Confirm, ErrorBox } from "@/components/forms";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { money, type Category, type OptionGroup, type Product, type ProductOption } from "@/lib/catalog";

type CategoryDraft = Partial<Category> & { name: string; sortOrder: number; active: number };
type ProductDraft = Partial<Product> & { name: string; description: string; categoryId: string; price: number; serves: string; available: number; image: string };
type GroupDraft = Partial<OptionGroup> & { productId: string; name: string; minSelect: number; maxSelect: number; sortOrder: number; active: number };
type OptionDraft = Partial<ProductOption> & { groupId: string; name: string; price: number; sortOrder: number; active: number };

export default function CatalogManagement({ admin }: { admin: boolean }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [categoryEdit, setCategoryEdit] = useState<CategoryDraft | null>(null);
  const [productEdit, setProductEdit] = useState<ProductDraft | null>(null);
  const [optionsProductId, setOptionsProductId] = useState<string | null>(null);
  const [groupEdit, setGroupEdit] = useState<GroupDraft | null>(null);
  const [optionEdit, setOptionEdit] = useState<OptionDraft | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api("/api/manage");
      setProducts(data.products);
      setCategories(data.categories);
      setError("");
    } catch (caught) {
      setError((caught as Error).message);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function save(action: string, payload: Record<string, unknown>) {
    setBusy(true);
    try {
      await api("/api/manage", { action, ...payload });
      await load();
      toast.success("Cardápio atualizado");
      return true;
    } catch (caught) {
      toast.error((caught as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function toggle(product: Product) {
    await save("availability", { id: product.id, available: !product.available });
  }

  const selectedProduct = products.find((product) => product.id === optionsProductId) || null;
  const activeCategories = categories.filter((category) => category.active);

  return <>
    <div className="toolbar">
      <p className="muted">Operadores podem pausar itens. Categorias, preços, fotos e adicionais são administrados pelo perfil administrador.</p>
      {admin && <div className="actions">
        <button className="secondary" onClick={() => setCategoryEdit({ name: "", sortOrder: categories.length, active: 1 })}><Plus size={17} />Categoria</button>
        <button className="primary" disabled={!activeCategories.length} onClick={() => setProductEdit({ name: "", description: "", categoryId: activeCategories[0]?.id || "", price: 0, serves: "", available: 1, image: "" })}><Plus size={17} />Produto</button>
      </div>}
    </div>
    <ErrorBox message={error} />
    {admin && <section className="panel">
      <h2>Categorias</h2>
      <Table><TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Ordem</TableHead><TableHead>Status</TableHead><TableHead>Ação</TableHead></TableRow></TableHeader>
        <TableBody>{categories.map((category) => <TableRow key={category.id}><TableCell><strong>{category.name}</strong></TableCell><TableCell>{category.sortOrder}</TableCell><TableCell>{category.active ? "Ativa" : "Oculta"}</TableCell><TableCell><button className="text-button" onClick={() => setCategoryEdit({ ...category })}>Editar</button></TableCell></TableRow>)}</TableBody>
      </Table>
      {!categories.length && <p className="muted">Crie a primeira categoria antes de cadastrar produtos.</p>}
    </section>}
    <section className="panel">
      <h2>Produtos</h2>
      <Table><TableHeader><TableRow><TableHead>Produto</TableHead><TableHead>Categoria</TableHead><TableHead>Preço base</TableHead><TableHead>Disponível</TableHead>{admin && <TableHead>Ações</TableHead>}</TableRow></TableHeader>
        <TableBody>{products.map((product) => <TableRow key={product.id}>
          <TableCell><strong>{product.name}</strong><small className="block muted">{product.serves}{product.optionGroups?.length ? ` · ${product.optionGroups.length} grupo(s) de opções` : ""}</small></TableCell>
          <TableCell>{product.category}</TableCell><TableCell>{money(product.price)}</TableCell>
          <TableCell><Switch checked={Boolean(product.available)} onCheckedChange={() => toggle(product)} aria-label={"Disponibilidade de " + product.name} /></TableCell>
          {admin && <TableCell><div className="actions"><button className="text-button" onClick={() => setProductEdit({ ...product, categoryId: product.categoryId || "", available: Number(product.available) })}>Editar</button><button className="text-button" onClick={() => setOptionsProductId(product.id)}>Adicionais</button></div></TableCell>}
        </TableRow>)}</TableBody>
      </Table>
      {!products.length && <p className="muted">O cardápio ainda está vazio.</p>}
    </section>

    <Dialog open={Boolean(categoryEdit)} onOpenChange={(open) => { if (!open) setCategoryEdit(null); }}>
      <DialogContent><DialogHeader><DialogTitle>{categoryEdit?.id ? "Editar categoria" : "Nova categoria"}</DialogTitle><DialogDescription>A ordem menor aparece primeiro no cardápio.</DialogDescription></DialogHeader>
        {categoryEdit && <form className="form-stack" onSubmit={async (event) => { event.preventDefault(); if (await save("category", { category: { ...categoryEdit, active: Boolean(categoryEdit.active) } })) setCategoryEdit(null); }}>
          <label className="field">Nome<input required minLength={2} maxLength={80} value={categoryEdit.name} onChange={(event) => setCategoryEdit({ ...categoryEdit, name: event.target.value })} /></label>
          <label className="field">Ordem<input required type="number" min="0" max="999" value={categoryEdit.sortOrder} onChange={(event) => setCategoryEdit({ ...categoryEdit, sortOrder: Number(event.target.value) })} /></label>
          <Confirm checked={Boolean(categoryEdit.active)} onChange={(active) => setCategoryEdit({ ...categoryEdit, active: Number(active) })}>Exibir categoria no cardápio</Confirm>
          <button className="primary" disabled={busy}>{busy ? "Salvando…" : "Salvar categoria"}</button>
        </form>}
      </DialogContent>
    </Dialog>

    <Dialog open={Boolean(productEdit)} onOpenChange={(open) => { if (!open) setProductEdit(null); }}>
      <DialogContent className="scroll-dialog"><DialogHeader><DialogTitle>{productEdit?.id ? "Editar produto" : "Novo produto"}</DialogTitle><DialogDescription>O preço base não inclui adicionais.</DialogDescription></DialogHeader>
        {productEdit && <form className="form-stack" onSubmit={async (event) => { event.preventDefault(); if (await save("product", { product: { ...productEdit, available: Boolean(productEdit.available) } })) setProductEdit(null); }}>
          <label className="field">Nome<input required minLength={2} maxLength={100} value={productEdit.name} onChange={(event) => setProductEdit({ ...productEdit, name: event.target.value })} /></label>
          <label className="field">Descrição<textarea required minLength={2} maxLength={350} value={productEdit.description} onChange={(event) => setProductEdit({ ...productEdit, description: event.target.value })} /></label>
          <Choice label="Categoria" value={productEdit.categoryId} onChange={(categoryId) => setProductEdit({ ...productEdit, categoryId })} options={categories.map((category) => ({ value: category.id, label: category.active ? category.name : category.name + " (oculta)" }))} />
          <div className="form-row"><label className="field">Preço base (R$)<input required type="number" min="0.01" step="0.01" value={productEdit.price / 100 || ""} onChange={(event) => setProductEdit({ ...productEdit, price: Math.round(Number(event.target.value) * 100) })} /></label><label className="field">Porção<input maxLength={100} value={productEdit.serves} onChange={(event) => setProductEdit({ ...productEdit, serves: event.target.value })} /></label></div>
          <label className="field">Foto — URL HTTPS ou caminho local<input maxLength={500} placeholder="https://… ou /imagem.jpg" value={productEdit.image} onChange={(event) => setProductEdit({ ...productEdit, image: event.target.value })} /></label>
          {productEdit.image && <img src={productEdit.image} alt="Prévia do produto" className="product-preview" />}
          <Confirm checked={Boolean(productEdit.available)} onChange={(available) => setProductEdit({ ...productEdit, available: Number(available) })}>Disponível para pedidos</Confirm>
          <button className="primary" disabled={busy}>{busy ? "Salvando…" : "Salvar produto"}</button>
        </form>}
      </DialogContent>
    </Dialog>

    <Dialog open={Boolean(selectedProduct)} onOpenChange={(open) => { if (!open) setOptionsProductId(null); }}>
      <DialogContent className="scroll-dialog"><DialogHeader><DialogTitle>Adicionais de {selectedProduct?.name}</DialogTitle><DialogDescription>Crie grupos obrigatórios ou opcionais e defina os limites de seleção.</DialogDescription></DialogHeader>
        {selectedProduct && <div className="form-stack">
          <button className="secondary" onClick={() => setGroupEdit({ productId: selectedProduct.id, name: "", minSelect: 0, maxSelect: 1, sortOrder: selectedProduct.optionGroups?.length || 0, active: 1 })}><Plus size={16} />Novo grupo</button>
          {(selectedProduct.optionGroups || []).map((group) => <section className="notice" key={group.id}>
            <div className="split"><div><strong>{group.name}</strong><small className="block">{group.minSelect} a {group.maxSelect} seleção(ões) · {group.active ? "Ativo" : "Oculto"}</small></div><button className="text-button" onClick={() => setGroupEdit({ ...group })}>Editar grupo</button></div>
            <div className="form-stack">{group.options.map((option) => <div className="split" key={option.id}><span>{option.name} · {money(option.price)} {option.active ? "" : "· Oculta"}</span><button className="text-button" onClick={() => setOptionEdit({ ...option })}>Editar</button></div>)}</div>
            <button className="text-button" onClick={() => setOptionEdit({ groupId: group.id, name: "", price: 0, sortOrder: group.options.length, active: 1 })}><Plus size={14} />Adicionar opção</button>
          </section>)}
          {!selectedProduct.optionGroups?.length && <p className="muted">Este produto não possui grupos de adicionais.</p>}
        </div>}
      </DialogContent>
    </Dialog>

    <Dialog open={Boolean(groupEdit)} onOpenChange={(open) => { if (!open) setGroupEdit(null); }}>
      <DialogContent><DialogHeader><DialogTitle>{groupEdit?.id ? "Editar grupo" : "Novo grupo de opções"}</DialogTitle></DialogHeader>
        {groupEdit && <form className="form-stack" onSubmit={async (event) => { event.preventDefault(); if (await save("option-group", { group: { ...groupEdit, active: Boolean(groupEdit.active) } })) setGroupEdit(null); }}>
          <label className="field">Nome<input required minLength={2} maxLength={80} value={groupEdit.name} onChange={(event) => setGroupEdit({ ...groupEdit, name: event.target.value })} /></label>
          <div className="form-row"><label className="field">Mínimo<input required type="number" min="0" max="20" value={groupEdit.minSelect} onChange={(event) => setGroupEdit({ ...groupEdit, minSelect: Number(event.target.value) })} /></label><label className="field">Máximo<input required type="number" min="1" max="20" value={groupEdit.maxSelect} onChange={(event) => setGroupEdit({ ...groupEdit, maxSelect: Number(event.target.value) })} /></label></div>
          <label className="field">Ordem<input required type="number" min="0" max="999" value={groupEdit.sortOrder} onChange={(event) => setGroupEdit({ ...groupEdit, sortOrder: Number(event.target.value) })} /></label>
          <Confirm checked={Boolean(groupEdit.active)} onChange={(active) => setGroupEdit({ ...groupEdit, active: Number(active) })}>Grupo ativo</Confirm>
          <button className="primary" disabled={busy}>{busy ? "Salvando…" : "Salvar grupo"}</button>
        </form>}
      </DialogContent>
    </Dialog>

    <Dialog open={Boolean(optionEdit)} onOpenChange={(open) => { if (!open) setOptionEdit(null); }}>
      <DialogContent><DialogHeader><DialogTitle>{optionEdit?.id ? "Editar opção" : "Nova opção"}</DialogTitle></DialogHeader>
        {optionEdit && <form className="form-stack" onSubmit={async (event) => { event.preventDefault(); if (await save("option", { option: { ...optionEdit, active: Boolean(optionEdit.active) } })) setOptionEdit(null); }}>
          <label className="field">Nome<input required minLength={2} maxLength={80} value={optionEdit.name} onChange={(event) => setOptionEdit({ ...optionEdit, name: event.target.value })} /></label>
          <div className="form-row"><label className="field">Acréscimo (R$)<input required type="number" min="0" step="0.01" value={optionEdit.price / 100 || 0} onChange={(event) => setOptionEdit({ ...optionEdit, price: Math.round(Number(event.target.value) * 100) })} /></label><label className="field">Ordem<input required type="number" min="0" max="999" value={optionEdit.sortOrder} onChange={(event) => setOptionEdit({ ...optionEdit, sortOrder: Number(event.target.value) })} /></label></div>
          <Confirm checked={Boolean(optionEdit.active)} onChange={(active) => setOptionEdit({ ...optionEdit, active: Number(active) })}>Opção disponível</Confirm>
          <button className="primary" disabled={busy}>{busy ? "Salvando…" : "Salvar opção"}</button>
        </form>}
      </DialogContent>
    </Dialog>
  </>;
}
