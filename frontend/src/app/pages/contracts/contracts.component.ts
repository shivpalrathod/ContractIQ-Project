import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup
} from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  Contract,
  ContractCreate,
  ContractService
} from '../../services/contract.service';

import {
  AuthService,
  UserRole
} from '../../services/auth.service';

@Component({
  selector: 'app-contracts',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule
  ],
  templateUrl: './contracts.component.html',
  styleUrl: './contracts.component.scss'
})
export class ContractsComponent implements OnInit {

  private readonly contractService = inject(ContractService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  /* =========================================================
     CONTRACT DATA
     ========================================================= */

  contracts: Contract[] = [];
  filteredContracts: Contract[] = [];

  loading = true;
  error = '';

  searchTerm = '';

  /* =========================================================
     CREATE CONTRACT
     ========================================================= */

  showCreateForm = false;
  creating = false;
  createError = '';

  contractForm: FormGroup = this.fb.group({
    contract_number: [''],
    title: [''],
    category: [''],
    counterparty_name: [''],
    start_date: [null],
    end_date: [null],
    contract_value: [null],
    currency: ['INR'],
    description: ['']
  });

  /* =========================================================
     TABLE COLUMNS
     ========================================================= */

  displayedColumns: string[] = [
    'contract_number',
    'title',
    'category',
    'counterparty_name',
    'start_date',
    'end_date',
    'status',
    'actions'
  ];

  readonly UserRole = UserRole;

  /* =========================================================
     INITIALIZATION
     ========================================================= */

  ngOnInit(): void {
    this.loadContracts();
  }

  /* =========================================================
     LOAD CONTRACTS
     ========================================================= */

  loadContracts(): void {
    this.loading = true;
    this.error = '';

    this.contractService.getContracts().subscribe({
      next: (contracts) => {
        this.contracts = contracts;
        this.filteredContracts = [...contracts];
        this.loading = false;
      },

      error: (error) => {
        console.error('Contracts API error:', error);

        this.loading = false;

        if (error.status === 401) {
          this.error =
            'Your session has expired. Please log in again.';
        } else if (error.status === 403) {
          this.error =
            'You do not have permission to view these contracts.';
        } else if (error.status === 0) {
          this.error =
            'Unable to connect to the backend. Please make sure FastAPI is running.';
        } else {
          this.error =
            error.error?.detail ||
            'Unable to load contracts. Please try again.';
        }
      }
    });
  }

  /* =========================================================
     SEARCH
     ========================================================= */

  onSearch(): void {
    const search = this.searchTerm.trim().toLowerCase();

    if (!search) {
      this.filteredContracts = [...this.contracts];
      return;
    }

    this.filteredContracts = this.contracts.filter((contract) =>
      [
        contract.contract_number,
        contract.title,
        contract.category,
        contract.counterparty_name,
        contract.status
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(search)
        )
    );
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.filteredContracts = [...this.contracts];
  }

  /* =========================================================
     CONTRACT SUMMARY
     ========================================================= */

  get totalContracts(): number {
    return this.contracts.length;
  }

  get activeContracts(): number {
    return this.contracts.filter(
      contract => contract.status === 'Active'
    ).length;
  }

  get underReviewContracts(): number {
    return this.contracts.filter(
      contract => contract.status === 'Under Review'
    ).length;
  }

  get draftContracts(): number {
    return this.contracts.filter(
      contract => contract.status === 'Draft'
    ).length;
  }

  /* =========================================================
     ROLE / PERMISSION HELPERS
     ========================================================= */

  hasAnyRole(roles: UserRole[]): boolean {
    return this.authService.hasAnyRole(roles);
  }

  canDelete(): boolean {
    return this.authService.hasRole(
      UserRole.ADMINISTRATOR
    );
  }

  canManageContracts(): boolean {
    return this.hasAnyRole([
      UserRole.ADMINISTRATOR,
      UserRole.LEGAL_MANAGER,
      UserRole.CONTRACT_MANAGER
    ]);
  }

  canApprove(): boolean {
    return this.hasAnyRole([
      UserRole.ADMINISTRATOR,
      UserRole.LEGAL_MANAGER
    ]);
  }

  /* =========================================================
     CONTRACT ACTION PERMISSIONS
     ========================================================= */

  canSubmitForReview(contract: Contract): boolean {
    return (
      this.canManageContracts() &&
      contract.status === 'Draft'
    );
  }

  canApproveContract(contract: Contract): boolean {
    return (
      this.canApprove() &&
      contract.status === 'Under Review'
    );
  }

  canActivateContract(contract: Contract): boolean {
    return (
      this.canManageContracts() &&
      contract.status === 'Approved'
    );
  }

  /* =========================================================
     CREATE FORM
     ========================================================= */

  openCreateForm(): void {
    this.createError = '';

    this.contractForm.reset({
      contract_number: '',
      title: '',
      category: '',
      counterparty_name: '',
      start_date: null,
      end_date: null,
      contract_value: null,
      currency: 'INR',
      description: ''
    });

    this.showCreateForm = true;
  }

  closeCreateForm(): void {
    if (this.creating) {
      return;
    }

    this.showCreateForm = false;
    this.createError = '';
  }

  /* =========================================================
     CREATE CONTRACT
     ========================================================= */

  createContract(): void {
    this.createError = '';

    const formValue = this.contractForm.value;

    const title = String(formValue.title || '').trim();
    const contractNumber =
      String(formValue.contract_number || '').trim();
    const category =
      String(formValue.category || '').trim();

    if (!title) {
      this.createError = 'Contract title is required.';
      return;
    }

    if (!contractNumber) {
      this.createError = 'Contract number is required.';
      return;
    }

    if (!category) {
      this.createError = 'Contract category is required.';
      return;
    }

    const startDate = formValue.start_date;
    const endDate = formValue.end_date;

    if (
      startDate &&
      endDate &&
      startDate > endDate
    ) {
      this.createError =
        'End date must be after the start date.';
      return;
    }

    this.creating = true;

    const rawValue = formValue.contract_value;

    const contract: ContractCreate = {
      title: title,

      contract_number: contractNumber,

      category: category,

      description:
        String(formValue.description || '').trim() || null,

      counterparty_name:
        String(formValue.counterparty_name || '').trim() || null,

      start_date: startDate || null,

      end_date: endDate || null,

      contract_value:
        rawValue === null ||
        rawValue === undefined ||
        rawValue === '' ||
        Number.isNaN(Number(rawValue))
          ? null
          : Number(rawValue),

      currency:
        String(formValue.currency || 'INR')
          .trim()
          .toUpperCase() || null,

      assigned_to: null
    };

    this.contractService.createContract(contract).subscribe({
      next: () => {
        this.creating = false;
        this.showCreateForm = false;
        this.createError = '';

        this.loadContracts();
      },

      error: (error) => {
        console.error(
          'Create contract error:',
          error
        );

        this.creating = false;

        if (error.status === 400) {
          this.createError =
            error.error?.detail ||
            'Invalid contract information.';
        } else if (error.status === 401) {
          this.createError =
            'Your session has expired. Please log in again.';
        } else if (error.status === 403) {
          this.createError =
            'You do not have permission to create contracts.';
        } else if (error.status === 0) {
          this.createError =
            'Unable to connect to the backend.';
        } else {
          this.createError =
            error.error?.detail ||
            'Unable to create contract. Please try again.';
        }
      }
    });
  }

  /* =========================================================
     SUBMIT FOR REVIEW
     ========================================================= */

  submitForReview(contract: Contract): void {
    this.contractService
      .submitForReview(contract.id)
      .subscribe({
        next: () => {
          this.loadContracts();
        },

        error: (error) => {
          console.error(
            'Submit review error:',
            error
          );

          this.error =
            error.error?.detail ||
            'Unable to submit contract for review.';
        }
      });
  }

  /* =========================================================
     APPROVE CONTRACT
     ========================================================= */

  approveContract(contract: Contract): void {
    this.contractService
      .approveContract(contract.id)
      .subscribe({
        next: () => {
          this.loadContracts();
        },

        error: (error) => {
          console.error(
            'Approve contract error:',
            error
          );

          this.error =
            error.error?.detail ||
            'Unable to approve contract.';
        }
      });
  }

  /* =========================================================
     ACTIVATE CONTRACT
     ========================================================= */

  activateContract(contract: Contract): void {
    this.contractService
      .activateContract(contract.id)
      .subscribe({
        next: () => {
          this.loadContracts();
        },

        error: (error) => {
          console.error(
            'Activate contract error:',
            error
          );

          this.error =
            error.error?.detail ||
            'Unable to activate contract.';
        }
      });
  }

  /* =========================================================
     DELETE CONTRACT
     ========================================================= */

  deleteContract(contract: Contract): void {
    const confirmed = window.confirm(
      `Are you sure you want to delete contract "${contract.title}"?`
    );

    if (!confirmed) {
      return;
    }

    this.contractService
      .deleteContract(contract.id)
      .subscribe({
        next: () => {
          this.loadContracts();
        },

        error: (error) => {
          console.error(
            'Delete contract error:',
            error
          );

          this.error =
            error.error?.detail ||
            'Unable to delete contract.';
        }
      });
  }

  /* =========================================================
     FORMAT CONTRACT VALUE
     ========================================================= */

  formatValue(contract: Contract): string {
    if (
      contract.contract_value === null ||
      contract.contract_value === undefined
    ) {
      return '—';
    }

    const currency = contract.currency
      ? `${contract.currency} `
      : '';

    return `${currency}${contract.contract_value}`;
  }

  /* =========================================================
     STATUS CSS CLASS
     ========================================================= */

  getStatusClass(status: string): string {
    return status
      .toLowerCase()
      .replace(/\s+/g, '-');
  }
}