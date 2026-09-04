export interface PoliInitiateTransactionRequest {
  Amount: number;
  CurrencyCode: 'NZD';
  MerchantReference: string;
  MerchantHomepageURL: string;
  SuccessURL: string;
  FailureURL: string;
  CancellationURL: string;
  NotificationURL: string;
}

export interface PoliInitiateTransactionResponse {
  Success?: boolean;
  NavigateURL?: string;
  ErrorCode?: number;
  ErrorMessage?: string;
  TransactionRefNo?: string;
}

export interface PoliTransactionDetails {
  TransactionRefNo?: string;
  TransactionStatusCode?: string;
  EstablishedDateTime?: string;
  EndDateTime?: string;
  PaymentAmount?: number;
  AmountPaid?: number;
}

export interface PoliMerchantDetails {
  MerchantReference?: string;
}

export interface PoliGetTransactionResponse {
  TransactionDetails?: PoliTransactionDetails;
  MerchantDetails?: PoliMerchantDetails;
}
