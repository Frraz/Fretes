from django.contrib import admin
from .models import Motorista, Romaneio, Abastecimento, Adiantamento, ImportLog

@admin.register(Motorista)
class MotoristaAdmin(admin.ModelAdmin):
    list_display = ("nome", "placa")
    search_fields = ("nome", "placa")

@admin.register(Romaneio)
class RomaneioAdmin(admin.ModelAdmin):
    list_display = ("data", "grupo", "motorista", "talhao", "nota_fiscal", "valor_total", "status")
    list_filter = ("grupo", "status", "talhao")
    search_fields = ("motorista__nome", "motorista__placa")

@admin.register(Abastecimento)
class AbastecimentoAdmin(admin.ModelAdmin):
    list_display = ("data_requisicao", "grupo", "motorista", "qtd_litros", "vl_desconto_total", "status")
    list_filter = ("grupo", "status")

@admin.register(Adiantamento)
class AdiantamentoAdmin(admin.ModelAdmin):
    list_display = ("data", "grupo", "motorista", "valor", "status")
    list_filter = ("grupo", "status")

@admin.register(ImportLog)
class ImportLogAdmin(admin.ModelAdmin):
    list_display = ("timestamp", "status", "romaneios_count", "abastecimentos_count", "adiantamentos_count")
