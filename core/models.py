from django.db import models


class Grupo(models.TextChoices):
    SF = "SF", "Sagrada Família"
    SJ = "SJ", "São José"


class Status(models.TextChoices):
    EM_ABERTO = "EM ABERTO", "Em Aberto"
    LANCADO = "LANÇADO", "Lançado"
    FECHADO = "FECHADO", "Fechado"


class Motorista(models.Model):
    nome = models.CharField(max_length=200)
    placa = models.CharField(max_length=20, db_index=True)

    class Meta:
        ordering = ["nome"]
        unique_together = ["nome", "placa"]

    def __str__(self):
        return f"{self.nome} ({self.placa})"


class Romaneio(models.Model):
    grupo = models.CharField(max_length=2, choices=Grupo.choices, db_index=True)
    data = models.DateField(null=True, blank=True)
    nota_fiscal = models.CharField(max_length=50, blank=True, default="")
    ticket = models.CharField(max_length=50, blank=True, default="")
    origem = models.CharField(max_length=200, blank=True, default="", db_index=True)
    talhao = models.CharField("Talhão", max_length=200, blank=True, default="", db_index=True)
    destino = models.CharField(max_length=200, blank=True, default="")
    motorista = models.ForeignKey(Motorista, on_delete=models.CASCADE, related_name="romaneios")
    peso_liquido = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    valor_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.EM_ABERTO, db_index=True)
    observacao = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-data"]

    @property
    def sacas(self):
        if self.peso_liquido:
            return round(float(self.peso_liquido) / 60, 2)
        return 0

    def __str__(self):
        return f"NF {self.nota_fiscal} | {self.motorista.placa} | R$ {self.valor_total}"


class Abastecimento(models.Model):
    grupo = models.CharField(max_length=2, choices=Grupo.choices, db_index=True)
    data_requisicao = models.DateField(null=True, blank=True)
    data_abastecimento = models.DateField(null=True, blank=True)
    motorista = models.ForeignKey(Motorista, on_delete=models.CASCADE, related_name="abastecimentos")
    num_requisicao = models.CharField(max_length=50, blank=True, default="")
    qtd_litros = models.DecimalField(max_digits=10, decimal_places=3, default=0)
    vl_unitario = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    valor_posto = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    vl_desconto_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    diferenca = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.EM_ABERTO, db_index=True)
    observacao = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-data_requisicao"]

    def __str__(self):
        return f"Req {self.num_requisicao} | {self.motorista.placa} | R$ {self.vl_desconto_total}"


class Adiantamento(models.Model):
    grupo = models.CharField(max_length=2, choices=Grupo.choices, db_index=True)
    data = models.DateField(null=True, blank=True)
    descricao = models.TextField(blank=True, default="")
    motorista = models.ForeignKey(Motorista, on_delete=models.CASCADE, related_name="adiantamentos")
    valor = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    conta_envio = models.CharField(max_length=200, blank=True, default="")
    conta_destino = models.CharField(max_length=200, blank=True, default="")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.EM_ABERTO, db_index=True)
    observacao = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-data"]

    def __str__(self):
        return f"{self.descricao[:40]} | {self.motorista.placa} | R$ {self.valor}"


class ImportLog(models.Model):
    timestamp = models.DateTimeField(auto_now_add=True)
    romaneios_count = models.IntegerField(default=0)
    abastecimentos_count = models.IntegerField(default=0)
    adiantamentos_count = models.IntegerField(default=0)
    motoristas_count = models.IntegerField(default=0)
    status = models.CharField(max_length=20, default="OK")
    erro = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-timestamp"]
