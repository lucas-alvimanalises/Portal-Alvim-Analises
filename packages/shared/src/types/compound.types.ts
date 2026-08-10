export interface CompoundDto {
  id: string;
  // Código numérico da pasta usada internamente pela Alvim (ex.: "11000").
  code: string;
  name: string;
  active: boolean;
  // Tipo de amostrador físico correspondente (ex.: "Bag Tedlar", "Frasco
  // âmbar 500ml") — preparação de dado pra uma fase futura de solicitação
  // de amostradores ao laboratório, ainda sem fluxo nenhum usando isso.
  samplerType: string | null;
}
