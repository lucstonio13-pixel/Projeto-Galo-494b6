"use client";

import { useState } from "react";
import { money } from "@/lib/catalog";
import { SAO_LUIS_NEIGHBORHOODS } from "@/lib/sao-luis-neighborhoods";

type Props = {
  areas: string[];
  areaFees: Record<string, number>;
  onChange: (areas: string[], areaFees: Record<string, number>) => void;
};

export default function DeliveryAreas({ areas, areaFees, onChange }: Props) {
  const [name, setName] = useState("");
  const [fee, setFee] = useState("0");
  const [error, setError] = useState("");

  function add() {
    const nextName = name.trim();
    const nextFee = Math.round(Number(fee) * 100);
    if (nextName.length < 2) return setError("Informe um bairro ou região.");
    if (!Number.isInteger(nextFee) || nextFee < 0 || nextFee > 50000) return setError("Informe uma taxa entre R$ 0,00 e R$ 500,00.");
    if (areas.some((area) => area.toLocaleLowerCase("pt-BR") === nextName.toLocaleLowerCase("pt-BR"))) return setError("Este bairro ou região já foi adicionado.");
    onChange([...areas, nextName], { ...areaFees, [nextName]: nextFee });
    setName("");
    setFee("0");
    setError("");
  }

  function rename(index: number, nextName: string) {
    const previousName = areas[index];
    const nextAreas = areas.map((area, areaIndex) => areaIndex === index ? nextName : area);
    const nextFees = { ...areaFees };
    delete nextFees[previousName];
    nextFees[nextName] = areaFees[previousName] ?? 0;
    onChange(nextAreas, nextFees);
  }

  function changeFee(area: string, value: number) {
    onChange(areas, { ...areaFees, [area]: Math.round(value * 100) });
  }

  function remove(index: number) {
    const removed = areas[index];
    const nextFees = { ...areaFees };
    delete nextFees[removed];
    onChange(areas.filter((_, areaIndex) => areaIndex !== index), nextFees);
  }

  return <section className="delivery-area-editor" aria-labelledby="delivery-area-title">
    <div>
      <strong id="delivery-area-title">Bairros e taxas de entrega</strong>
      <p className="small-note">Adicione somente onde a loja realmente entrega. As sugestões territoriais vêm do mapa do INCID/Prefeitura, mas continuam totalmente editáveis.</p>
    </div>
    <div className="delivery-area-add">
      <label className="field">Bairro ou região
        <input list="sao-luis-neighborhoods" value={name} maxLength={100} placeholder="Ex.: Centro" onChange={(event) => setName(event.target.value)} />
        <datalist id="sao-luis-neighborhoods">{SAO_LUIS_NEIGHBORHOODS.map((area) => <option value={area} key={area} />)}</datalist>
      </label>
      <label className="field">Taxa (R$)
        <input type="number" min="0" max="500" step="0.01" value={fee} onChange={(event) => setFee(event.target.value)} />
      </label>
      <button type="button" className="secondary" onClick={add}>Adicionar</button>
    </div>
    {error && <div className="error-box" role="alert">{error}</div>}
    <div className="delivery-area-list">
      {areas.map((area, index) => <div className="delivery-area-row" key={index}>
        <label className="field">Bairro ou região
          <input required minLength={2} maxLength={100} value={area} onChange={(event) => rename(index, event.target.value)} />
        </label>
        <label className="field">Taxa
          <input required type="number" min="0" max="500" step="0.01" value={(areaFees[area] ?? 0) / 100} onChange={(event) => changeFee(area, Number(event.target.value))} />
        </label>
        <span>{money(areaFees[area] ?? 0)}</span>
        <button type="button" className="text-button danger" onClick={() => remove(index)}>Remover</button>
      </div>)}
      {!areas.length && <div className="notice">Nenhum bairro atendido. A entrega permanecerá indisponível até que pelo menos uma área seja adicionada.</div>}
    </div>
    <a className="small-note" href="https://www.saoluis.ma.gov.br/arquivos/mapa_porcentagem_de_domicilios_abastecidos_com_esgoto_da_red_18081732.pdf" target="_blank" rel="noreferrer">Consultar mapa territorial oficial ↗</a>
  </section>;
}
