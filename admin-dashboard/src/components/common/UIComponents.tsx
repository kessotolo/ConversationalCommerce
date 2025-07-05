import React from 'react';

interface AlertProps {
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  onClose?: () => void;
}

export const Alert: React.FC<AlertProps> = ({ type, message, onClose }) => {
  return (
    <div className={`alert alert-${type}`}>
      <span className="alert-message">{message}</span>
      {onClose && (
        <button className="alert-close" onClick={onClose}>
          ×
        </button>
      )}
    </div>
  );
};

interface SpinnerProps {
  size?: 'small' | 'medium' | 'large';
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'medium' }) => {
  return (
    <div className={`spinner spinner-${size}`}>
      <div className="spinner-border" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
    </div>
  );
};

interface BadgeProps {
  label: string;
  type: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
}

export const Badge: React.FC<BadgeProps> = ({ label, type }) => {
  return <span className={`badge badge-${type}`}>{label}</span>;
};

interface ButtonProps {
  label: string;
  onClick: () => void;
  type?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onClick,
  type = 'primary',
  disabled = false,
  size = 'medium',
  icon
}) => {
  return (
    <button 
      className={`btn btn-${type} btn-${size}`} 
      onClick={onClick}
      disabled={disabled}
    >
      {icon && <span className="btn-icon">{icon}</span>}
      <span className="btn-text">{label}</span>
    </button>
  );
};

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ title, children, className = '' }) => {
  return (
    <div className={`card ${className}`}>
      {title && <div className="card-header">{title}</div>}
      <div className="card-body">{children}</div>
    </div>
  );
};

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
};
