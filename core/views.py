from decimal import Decimal
from django.db.models import Sum, Q, Count
from django.db.models.functions import Coalesce
from django.http import JsonResponse
from django.shortcuts import render, get_object_or_404
from django.core.management import call_command
from io import StringIO
from .models import Motorista, Romaneio, Abastecimento, Adiantamento, ImportLog

ZERO = Decimal("0")
ATIVOS = ["EM ABERTO", "LANÇADO"]


def _resumo(grupo=None):
    motoristas = Motorista.objects.all()
    results = []
    for mot in motoristas:
        rom = mot.romaneios.filter(status__in=ATIVOS)
        ab = mot.abastecimentos.filter(status__in=ATIVOS)
        ad = mot.adiantamentos.filter(status__in=ATIVOS)
        if grupo and grupo != "ALL":
            rom, ab, ad = rom.filter(grupo=grupo), ab.filter(grupo=grupo), ad.filter(grupo=grupo)
        tr = float(rom.aggregate(t=Coalesce(Sum("valor_total"), ZERO))["t"])
        ta = float(ab.aggregate(t=Coalesce(Sum("vl_desconto_total"), ZERO))["t"])
        td = float(ad.aggregate(t=Coalesce(Sum("valor"), ZERO))["t"])
        saldo = tr - ta - td
        if tr == 0 and ta == 0 and td == 0:
            continue
        results.append({
            "id": mot.id, "placa": mot.placa, "motorista": mot.nome,
            "romaneios": round(tr, 2), "abastecimentos": round(ta, 2),
            "adiantamentos": round(td, 2), "descontos": round(ta + td, 2),
            "saldo": round(saldo, 2),
            "situacao": "A RECEBER" if saldo > 0.01 else ("DEVEDOR" if saldo < -0.01 else "QUITADO"),
            "qtd_rom": rom.count(), "qtd_ab": ab.count(), "qtd_ad": ad.count(),
        })
    results.sort(key=lambda x: x["saldo"], reverse=True)
    return results


def dashboard(request):
    last_import = ImportLog.objects.first()
    return render(request, "core/dashboard.html", {"last_import": last_import})


def api_kpis(request):
    g = request.GET.get("grupo", "ALL").upper()
    resumo = _resumo(g)
    tr = sum(r["romaneios"] for r in resumo)
    ta = sum(r["abastecimentos"] for r in resumo)
    td = sum(r["adiantamentos"] for r in resumo)
    ts = sum(r["saldo"] for r in resumo)
    rec = [r for r in resumo if r["situacao"] == "A RECEBER"]
    dev = [r for r in resumo if r["situacao"] == "DEVEDOR"]
    qui = [r for r in resumo if r["situacao"] == "QUITADO"]
    last = ImportLog.objects.first()
    return JsonResponse({
        "grupo": g,
        "total_romaneios": round(tr, 2), "total_abastecimentos": round(ta, 2),
        "total_adiantamentos": round(td, 2), "total_descontos": round(ta + td, 2),
        "saldo_liquido": round(ts, 2),
        "total_a_receber": round(sum(r["saldo"] for r in rec), 2),
        "total_devendo": round(sum(abs(r["saldo"]) for r in dev), 2),
        "qtd_a_receber": len(rec), "qtd_devedores": len(dev), "qtd_quitados": len(qui),
        "qtd_ativos": len(rec) + len(dev),
        "alertas": [{"motorista": r["motorista"], "placa": r["placa"], "saldo": r["saldo"], "adiantamentos": r["adiantamentos"]}
                    for r in sorted(dev, key=lambda x: x["saldo"]) if r["saldo"] < -5000],
        "atualizado": last.timestamp.strftime("%d/%m/%Y %H:%M") if last else "",
    })


def api_resumo(request):
    g = request.GET.get("grupo", "ALL").upper()
    return JsonResponse({"grupo": g, "resumo": _resumo(g)})


def api_motorista_detalhe(request, motorista_id):
    g = request.GET.get("grupo", "ALL").upper()
    mot = get_object_or_404(Motorista, id=motorista_id)
    rom = mot.romaneios.filter(status__in=ATIVOS)
    ab = mot.abastecimentos.filter(status__in=ATIVOS)
    ad = mot.adiantamentos.filter(status__in=ATIVOS)
    if g != "ALL":
        rom, ab, ad = rom.filter(grupo=g), ab.filter(grupo=g), ad.filter(grupo=g)

    def _f(v):
        return float(v) if isinstance(v, Decimal) else v

    def _clean(qs, fields):
        return [{k: _f(v) if isinstance(v, Decimal) else (v.strftime("%Y-%m-%d") if hasattr(v, "strftime") else v) for k, v in row.items()} for row in qs.values(*fields)]

    tr = float(rom.aggregate(t=Coalesce(Sum("valor_total"), ZERO))["t"])
    ta = float(ab.aggregate(t=Coalesce(Sum("vl_desconto_total"), ZERO))["t"])
    td = float(ad.aggregate(t=Coalesce(Sum("valor"), ZERO))["t"])

    return JsonResponse({
        "id": mot.id, "nome": mot.nome, "placa": mot.placa,
        "total_romaneios": round(tr, 2), "total_abastecimentos": round(ta, 2),
        "total_adiantamentos": round(td, 2), "saldo": round(tr - ta - td, 2),
        "romaneios": _clean(rom, ["id", "grupo", "data", "nota_fiscal", "ticket", "origem", "talhao", "destino", "peso_liquido", "valor_total", "status"]),
        "abastecimentos": _clean(ab, ["id", "grupo", "data_requisicao", "num_requisicao", "qtd_litros", "vl_unitario", "valor_posto", "vl_desconto_total", "status"]),
        "adiantamentos": _clean(ad, ["id", "grupo", "data", "descricao", "valor", "conta_envio", "conta_destino", "status"]),
    })


def api_colheita(request):
    g = request.GET.get("grupo", "ALL").upper()
    qs = Romaneio.objects.filter(status__in=ATIVOS).exclude(talhao="")
    if g != "ALL":
        qs = qs.filter(grupo=g)
    data = qs.values("talhao", "origem").annotate(
        peso_total=Sum("peso_liquido"), valor_total=Sum("valor_total"), viagens=Count("id"),
    ).order_by("-peso_total")
    result = []
    for row in data:
        peso = float(row["peso_total"] or 0)
        result.append({
            "talhao": row["talhao"], "origem": row["origem"],
            "peso_kg": round(peso, 2), "sacas": round(peso / 60, 2),
            "valor_total": float(row["valor_total"] or 0), "viagens": row["viagens"],
        })
    tp = sum(r["peso_kg"] for r in result)
    ts = sum(r["sacas"] for r in result)
    tv = sum(r["valor_total"] for r in result)
    tvi = sum(r["viagens"] for r in result)
    return JsonResponse({
        "grupo": g, "talhoes": result,
        "totais": {"peso_kg": round(tp, 2), "sacas": round(ts, 2), "valor_total": round(tv, 2), "viagens": tvi},
    })


def api_romaneios(request):
    g = request.GET.get("grupo", "ALL").upper()
    qs = Romaneio.objects.select_related("motorista").all()
    if g != "ALL": qs = qs.filter(grupo=g)
    return JsonResponse([{
        "data": r.data.strftime("%Y-%m-%d") if r.data else None,
        "nota_fiscal": r.nota_fiscal, "ticket": r.ticket,
        "origem": r.origem, "talhao": r.talhao, "destino": r.destino,
        "motorista": r.motorista.nome, "placa": r.motorista.placa,
        "peso_liquido": float(r.peso_liquido), "sacas": r.sacas,
        "valor_total": float(r.valor_total), "status": r.status, "grupo": r.grupo,
    } for r in qs], safe=False)


def api_abastecimentos(request):
    g = request.GET.get("grupo", "ALL").upper()
    qs = Abastecimento.objects.select_related("motorista").all()
    if g != "ALL": qs = qs.filter(grupo=g)
    return JsonResponse([{
        "data_requisicao": r.data_requisicao.strftime("%Y-%m-%d") if r.data_requisicao else None,
        "motorista": r.motorista.nome, "placa": r.motorista.placa,
        "num_req": r.num_requisicao, "qtd_litros": float(r.qtd_litros),
        "vl_unitario": float(r.vl_unitario), "valor_posto": float(r.valor_posto),
        "vl_desc_total": float(r.vl_desconto_total), "status": r.status, "grupo": r.grupo,
    } for r in qs], safe=False)


def api_adiantamentos(request):
    g = request.GET.get("grupo", "ALL").upper()
    qs = Adiantamento.objects.select_related("motorista").all()
    if g != "ALL": qs = qs.filter(grupo=g)
    return JsonResponse([{
        "data": r.data.strftime("%Y-%m-%d") if r.data else None,
        "motorista": r.motorista.nome, "placa": r.motorista.placa,
        "descricao": r.descricao, "valor": float(r.valor),
        "conta_envio": r.conta_envio, "conta_destino": r.conta_destino,
        "status": r.status, "grupo": r.grupo,
    } for r in qs], safe=False)


def api_filtros(request):
    talhoes = list(Romaneio.objects.exclude(talhao="").values_list("talhao", flat=True).distinct().order_by("talhao"))
    origens = list(Romaneio.objects.exclude(origem="").values_list("origem", flat=True).distinct().order_by("origem"))
    motoristas = list(Motorista.objects.values("id", "nome", "placa").order_by("nome"))
    return JsonResponse({"talhoes": talhoes, "origens": origens, "motoristas": motoristas})


def api_sync(request):
    """Reimporta a planilha do Google Drive e retorna o resultado."""
    out = StringIO()
    err = StringIO()
    try:
        call_command("importar_planilha", stdout=out, stderr=err)
        last = ImportLog.objects.first()
        return JsonResponse({
            "status": "ok",
            "atualizado": last.timestamp.strftime("%d/%m/%Y %H:%M") if last else "",
            "log": out.getvalue(),
        })
    except Exception as e:
        return JsonResponse({"status": "erro", "erro": str(e)}, status=500)